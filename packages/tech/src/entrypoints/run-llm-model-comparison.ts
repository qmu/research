import { writeFile, readFile, mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { MODELS } from "../llm-model-comparison/models";
import type {
  ComparisonResult,
  ConfigRun,
  HistoryFile,
  ModelCard,
  ProbeParams,
  RunEstimate,
} from "../llm-model-comparison/domain/types";
import { buildConfigRun, errorRun } from "../llm-model-comparison/run";
import type { JudgeConfig } from "../llm-model-comparison/run";
import { mergeConfigs } from "../llm-model-comparison/domain/merge";
import {
  appendHistory,
  buildHistoryEntry,
  selectErrored,
} from "../llm-model-comparison/domain/history";
import { renderComparisonReport } from "../llm-model-comparison/domain/report";
import type { DetailLevel } from "../llm-model-comparison/domain/report";
import { buildLatencyPrompt } from "../llm-model-comparison/domain/latency";
import { estimateRun } from "../llm-model-comparison/domain/estimate";
import type { CompletionClient } from "../vendors/llm/types";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createOpenAiRealtimeCompletionClient } from "../vendors/llm/openai-realtime";
import { createFixtureCompletionClient } from "../vendors/llm/fixture";

// Thin entrypoint: own the probe/trial policy and the CLI/env/IO wiring, build
// each model's client, sweep the model × effort matrix, delegate the trial loop +
// aggregation + judging to `run.ts` and the pure `domain/`, print the pre-run cost
// estimate, then write the report + the raw JSON run-artifact. No comparison,
// scoring, or statistics logic lives here.
//
// The sweep is a RECURRING, INCREMENTAL instrument, run on demand (no scheduler):
//  - a full run (no selector) re-benchmarks the whole matrix and overwrites the
//    latest artifact, as before;
//  - a selector (`--only-errored`, `--configs id:effort,…`, `--models`,
//    `--effort`) re-benchmarks only those configurations and MERGES the results
//    into the latest artifact (see domain/merge.ts) so untouched cells and real
//    measurements are preserved — the "give it a list to re-benchmark" path, and
//    the way errored models are covered without re-running everything;
//  - every real run appends a compact point to the historical series and archives
//    the full record gzipped, so results are a time series (see domain/history.ts).
// The merge/history shaping is pure and unit-tested; this file only wires the IO.

// Probe constants are orchestration policy, not domain truth — they live here and
// are echoed into the result for the Method section.
const PROBE: ProbeParams = {
  throughputTargetWords: 400,
  throughputTopic: "how large language models generate text",
  latencyPrompt: buildLatencyPrompt("the water cycle"),
  // Adaptive schema probe: climb each axis geometrically to a hard ceiling, then
  // bisect. A short fixed ladder only measured its own ceiling (near everything
  // hit 6/6). Caps sit well above where current models actually fail (a first
  // sweep measured ~depth 21 / breadth 72) so the tested maximum is the model's
  // limit, not the probe's — while staying low enough that the climb doesn't
  // waste large, slow calls probing far past every model's ceiling. A model that
  // clears a cap is reported as ">= cap".
  schemaProbe: {
    depth: { start: 2, cap: 48 },
    breadth: { start: 2, cap: 192 },
    refineSteps: 6,
    maxTokens: 8192,
  },
  lengthTargetWords: 100,
  lengthTopic: "the water cycle",
};

const DEFAULT_TRIALS = 3;

// The fixed LLM judge (a curated fact, recorded for real runs). Priced separately
// in the estimate because it is one model, not the model under test.
const JUDGE = {
  apiModelId: "claude-opus-4-8",
  provider: "anthropic" as const,
  inputCostPerMTok: 5,
  outputCostPerMTok: 25,
};

// Rough per-call token assumptions for the pre-run cost ESTIMATE only (real usage
// is measured and reported). The throughput probe dominates output tokens; the
// average is across all probe calls.
const ESTIMATE_AVG_INPUT_TOKENS = 200;
const ESTIMATE_AVG_OUTPUT_TOKENS = 1200; // schema calls generate sizable JSON
const ESTIMATE_JUDGE_INPUT_TOKENS = 1500;
const ESTIMATE_JUDGE_OUTPUT_TOKENS = 200;
const ESTIMATE_SECONDS_PER_CALL = 9; // schema-heavy calls are slower than chat

// A fixed timestamp for `--fixture` runs so the self-test report + artifact are
// byte-identical across runs (real runs stamp the wall clock).
const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const ENV_KEY: Record<ModelCard["provider"], string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
};

const CLIENT_FACTORY: Record<
  ModelCard["provider"],
  (apiModelId: string, apiKey: string) => CompletionClient
> = {
  anthropic: createAnthropicCompletionClient,
  openai: createOpenAiCompletionClient,
  google: createGoogleCompletionClient,
};

// Build the live client for a model, or undefined when the key is absent (the
// caller then uses the fixture path and flags the configuration fixtured).
const buildLiveClient = (card: ModelCard): CompletionClient | undefined => {
  const key = process.env[ENV_KEY[card.provider]];
  if (!key) {
    return undefined;
  }
  if (card.api === "realtime") {
    return createOpenAiRealtimeCompletionClient(card.apiModelId, key);
  }
  return CLIENT_FACTORY[card.provider](card.apiModelId, key);
};

// --- argument parsing (orchestration only) -----------------------------------

type Args = Readonly<{
  forceFixture: boolean;
  estimateOnly: boolean;
  trials: number;
  modelIds: ReadonlyArray<string> | null; // null = all models
  efforts: ReadonlyArray<string> | null; // null = every card's own levels
  detail: DetailLevel;
  // Incremental selectors. When any is set, the run re-benchmarks only the
  // selected configurations and MERGES them into the latest artifact instead of
  // overwriting the whole matrix.
  onlyErrored: boolean; // repair: re-run the latest record's errored cells
  configs: ReadonlyArray<string> | null; // explicit "id:effort" keys, or null
}>;

const parseList = (
  argv: ReadonlyArray<string>,
  flag: string,
): string[] | null => {
  const idx = argv.indexOf(flag);
  return idx >= 0 && argv[idx + 1]
    ? argv[idx + 1]
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
    : null;
};

const parseArgs = (argv: ReadonlyArray<string>): Args => {
  const trialsIdx = argv.indexOf("--trials");
  const parsedTrials =
    trialsIdx >= 0 ? Number(argv[trialsIdx + 1]) : DEFAULT_TRIALS;
  const trials =
    Number.isFinite(parsedTrials) && parsedTrials >= 1
      ? Math.floor(parsedTrials)
      : DEFAULT_TRIALS;
  const detailIdx = argv.indexOf("--detail");
  const rawDetail = detailIdx >= 0 ? argv[detailIdx + 1] : "standard";
  const detail: DetailLevel =
    rawDetail === "summary" || rawDetail === "full" ? rawDetail : "standard";
  return {
    forceFixture: argv.includes("--fixture"),
    estimateOnly: argv.includes("--estimate"),
    trials,
    modelIds: parseList(argv, "--models"),
    efforts: parseList(argv, "--effort"),
    detail,
    onlyErrored: argv.includes("--only-errored"),
    configs: parseList(argv, "--configs"),
  };
};

const selectModels = (
  ids: ReadonlyArray<string> | null,
): ReadonlyArray<ModelCard> => {
  if (ids === null) {
    return MODELS;
  }
  const chosen = MODELS.filter((m) => ids.includes(m.id));
  for (const id of ids.filter((x) => !MODELS.some((m) => m.id === x))) {
    process.stderr.write(`--models: no model with id "${id}"\n`);
  }
  return chosen;
};

// One (model, effort) configuration to run.
type Configuration = Readonly<{ card: ModelCard; effort: string }>;

// Expand the selected models into the configuration matrix, honoring an optional
// --effort filter (intersected with each card's declared levels).
const buildMatrix = (
  cards: ReadonlyArray<ModelCard>,
  efforts: ReadonlyArray<string> | null,
): ReadonlyArray<Configuration> =>
  cards.flatMap((card) => {
    const levels =
      efforts === null
        ? card.effortLevels
        : card.effortLevels.filter((e) => efforts.includes(e));
    return levels.map((effort) => ({ card, effort }));
  });

// --- incremental (merge-into-latest) selection -------------------------------

// The on-disk artifact shape (the `core` object written below): the complete
// record the report renders from and into which an incremental run merges.
type ComparisonCore = Readonly<{
  configs: ConfigRun[];
  trials: number;
  generatedAt: string;
  probe: ProbeParams;
  judgeModel: string;
  estimate: RunEstimate;
}>;

// Read the latest artifact for an incremental run, or null when none exists yet
// (first-ever run, or a fresh output path). Backfills `measuredAt` on configs
// written before that field existed so an older artifact still merges cleanly.
const loadPreviousCore = async (
  artifactPath: string,
): Promise<ComparisonCore | null> => {
  let text: string;
  try {
    text = await readFile(artifactPath, "utf8");
  } catch {
    return null;
  }
  const parsed = JSON.parse(text) as ComparisonCore;
  const configs = parsed.configs.map((c) => ({
    ...c,
    measuredAt: c.measuredAt ?? parsed.generatedAt,
  }));
  return { ...parsed, configs };
};

// Parse "id:effort" selector keys. id slugs and effort levels never contain ":",
// so splitting on the first ":" is unambiguous.
const parseConfigKeys = (
  keys: ReadonlyArray<string>,
): ReadonlyArray<{ id: string; effort: string }> =>
  keys
    .map((k) => {
      const i = k.indexOf(":");
      return i > 0 ? { id: k.slice(0, i), effort: k.slice(i + 1) } : null;
    })
    .filter((x): x is { id: string; effort: string } => x !== null);

// Resolve (id, effort) selector keys onto the configuration matrix against the
// current registry. A key whose model is no longer registered is reported and
// skipped rather than aborting the run.
const configurationsFromKeys = (
  keys: ReadonlyArray<{ id: string; effort: string }>,
  label: string,
): Configuration[] => {
  const out: Configuration[] = [];
  for (const { id, effort } of keys) {
    const card = MODELS.find((m) => m.id === id);
    if (!card) {
      process.stderr.write(
        `${label}: no model with id "${id}"; skipping ${id}:${effort}\n`,
      );
      continue;
    }
    out.push({ card, effort });
  }
  return out;
};

// Upper bound on the calls one schema axis makes: the geometric climb from
// `start` to `cap` (log2 doublings, +1 for the cap probe) plus the bisection
// budget. Used only for the pre-run estimate; the real count is a little lower
// when a model caps out early.
const schemaAxisCalls = (
  axis: ProbeParams["schemaProbe"]["depth"],
  refineSteps: number,
): number =>
  Math.floor(Math.log2(Math.max(1, axis.cap / axis.start))) + 2 + refineSteps;

const probeCallsPerConfig = (probe: ProbeParams, trials: number): number => {
  const sp = probe.schemaProbe;
  const schemaCalls =
    schemaAxisCalls(sp.depth, sp.refineSteps) +
    schemaAxisCalls(sp.breadth, sp.refineSteps);
  // throughput + latency + (depth axis + breadth axis) + length, per trial
  return (3 + schemaCalls) * trials;
};

const buildEstimate = (
  matrix: ReadonlyArray<Configuration>,
  trials: number,
): RunEstimate =>
  estimateRun({
    configs: matrix.map((c) => ({
      inputCostPerMTok: c.card.inputCostPerMTok,
      outputCostPerMTok: c.card.outputCostPerMTok,
    })),
    probeCallsPerConfig: probeCallsPerConfig(PROBE, trials),
    avgInputTokensPerCall: ESTIMATE_AVG_INPUT_TOKENS,
    avgOutputTokensPerCall: ESTIMATE_AVG_OUTPUT_TOKENS,
    judgeInputTokens: ESTIMATE_JUDGE_INPUT_TOKENS,
    judgeOutputTokens: ESTIMATE_JUDGE_OUTPUT_TOKENS,
    judgeInputCostPerMTok: JUDGE.inputCostPerMTok,
    judgeOutputCostPerMTok: JUDGE.outputCostPerMTok,
    secondsPerCall: ESTIMATE_SECONDS_PER_CALL,
  });

const printEstimate = (estimate: RunEstimate, trials: number): void => {
  process.stdout.write(
    `Pre-run estimate (${trials} trials): ` +
      `${estimate.configCount} configs × probes → ~${estimate.callCount} API calls, ` +
      `~$${estimate.usdCost.toFixed(2)} (rough), ` +
      `~${estimate.etaMinutes.toFixed(0)} min at ${ESTIMATE_SECONDS_PER_CALL}s/call.\n`,
  );
};

// Append this run to the compact history series and archive the full record
// gzipped under history/. Effectful (file IO + gzip); the shaping is pure in
// domain/history.ts. Called only on real runs — under --fixture the files would
// grow per invocation and break the byte-stable CI self-test.
const writeHistory = async (
  outputPath: string,
  core: ComparisonCore,
  runTimestamp: string,
  trials: number,
): Promise<void> => {
  const historyPath = outputPath.replace(/\.md$/, ".history.json");
  let history: HistoryFile | null = null;
  try {
    history = JSON.parse(await readFile(historyPath, "utf8")) as HistoryFile;
  } catch {
    history = null;
  }
  const updated = appendHistory(
    history,
    buildHistoryEntry(core.configs, runTimestamp, trials),
  );
  await writeFile(historyPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

  // Filenames can't carry ":"; ISO 2026-07-06T10:50:42.000Z → ...T10-50-42.000Z.
  const stamp = runTimestamp.replace(/:/g, "-");
  const archiveDir = join(dirname(outputPath), "history");
  await mkdir(archiveDir, { recursive: true });
  await writeFile(
    join(archiveDir, `${stamp}.data.json.gz`),
    gzipSync(Buffer.from(`${JSON.stringify(core, null, 2)}\n`, "utf8")),
  );
  process.stdout.write(
    `appended history point + archived full record for ${runTimestamp}\n`,
  );
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  // Output paths are needed up front: an incremental run reads the latest
  // artifact to merge into, and --only-errored derives its work from it.
  const outputPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/llm-model-comparison.md",
    );
  const artifactPath = outputPath.replace(/\.md$/, ".data.json");

  // A selector re-benchmarks a SUBSET and merges into the latest record; no
  // selector re-benchmarks the whole matrix and overwrites (the original flow).
  const selectorPresent =
    args.onlyErrored ||
    args.configs !== null ||
    args.modelIds !== null ||
    args.efforts !== null;
  const previous = selectorPresent
    ? await loadPreviousCore(artifactPath)
    : null;

  // Resolve the configuration matrix for this run.
  let matrix: ReadonlyArray<Configuration>;
  if (args.onlyErrored) {
    if (!previous) {
      process.stderr.write(
        `--only-errored: no previous artifact at ${artifactPath}; run a full sweep first\n`,
      );
      process.exitCode = 1;
      return;
    }
    const errored = selectErrored(previous.configs);
    if (errored.length === 0) {
      process.stdout.write(
        "--only-errored: no errored configurations in the latest record; nothing to repair.\n",
      );
      return;
    }
    matrix = configurationsFromKeys(
      errored.map((c) => ({ id: c.id, effort: c.effort })),
      "--only-errored",
    );
  } else if (args.configs !== null) {
    matrix = configurationsFromKeys(parseConfigKeys(args.configs), "--configs");
  } else {
    matrix = buildMatrix(selectModels(args.modelIds), args.efforts);
  }
  if (matrix.length === 0) {
    process.stderr.write("no configurations selected; nothing to do\n");
    process.exitCode = 1;
    return;
  }

  const estimate = buildEstimate(matrix, args.trials);
  printEstimate(estimate, args.trials);
  if (args.estimateOnly) {
    process.stdout.write("--estimate: dry run, no API calls made.\n");
    return;
  }

  // A fixed timestamp under --fixture (byte-identical self-test); the wall clock
  // otherwise. Stamped onto every config measured this run, and used as the
  // artifact's generatedAt.
  const runTimestamp = args.forceFixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();

  // The judge: a live judge client when a real Anthropic key is present and this
  // is not a forced-fixture run; otherwise the deterministic fixture judge.
  const judgeKey = process.env[ENV_KEY[JUDGE.provider]];
  const judgeLive = !args.forceFixture && Boolean(judgeKey);
  const judge: JudgeConfig = {
    client:
      judgeLive && judgeKey
        ? createAnthropicCompletionClient(JUDGE.apiModelId, judgeKey)
        : createFixtureCompletionClient(JUDGE.apiModelId),
    live: judgeLive,
    model: JUDGE.apiModelId,
  };

  // Build each model's live client once and reuse it across that model's effort
  // configurations.
  const clientFor = new Map<string, CompletionClient | undefined>();
  const liveClient = (card: ModelCard): CompletionClient | undefined => {
    if (!clientFor.has(card.id)) {
      clientFor.set(
        card.id,
        args.forceFixture ? undefined : buildLiveClient(card),
      );
    }
    return clientFor.get(card.id);
  };

  const fresh: ConfigRun[] = [];
  let done = 0;
  for (const { card, effort } of matrix) {
    let run: ConfigRun;
    try {
      run = await buildConfigRun(card, effort, {
        trials: args.trials,
        probe: PROBE,
        liveClient: liveClient(card),
        fixtureFor: (i) => createFixtureCompletionClient(card.apiModelId, i),
        judge,
        measuredAt: runTimestamp,
      });
    } catch (error: unknown) {
      // A configuration that fails catastrophically is recorded and skipped.
      process.stderr.write(`${card.modelName} (${effort}): ${String(error)}\n`);
      run = errorRun(
        card,
        effort,
        args.trials,
        String(error),
        JUDGE.apiModelId,
        runTimestamp,
      );
    }
    fresh.push(run);
    done += 1;
    // Stream per-config progress the moment each config finishes, so a long real
    // sweep is observable instead of silent until the very end.
    const s = run.stats;
    const line =
      run.provenance === "measured"
        ? `${s.throughputTokensPerSec.mean.toFixed(0)} tok/s, ttft ${s.ttftMs.mean.toFixed(0)}ms, schema depth ${s.maxSchemaDepth.mean.toFixed(0)}/breadth ${s.maxSchemaBreadth.mean.toFixed(0)}, length ${(s.lengthAccuracy.mean * 100).toFixed(0)}%`
        : run.provenance;
    process.stderr.write(
      `[${done}/${matrix.length}] ${run.provider}/${run.modelName} [${run.effort}]: ${line}\n`,
    );
  }

  // Incremental runs MERGE the fresh configs into the previous record (never
  // downgrading a real measurement); a full run replaces it outright.
  const configs: ConfigRun[] = previous
    ? mergeConfigs(previous.configs, fresh)
    : fresh;

  // The artifact is the COMPLETE record — every configuration, trial, and call
  // captured verbatim — so a report can be regenerated at any detail level from
  // it without re-running the (costly) sweep.
  const core: ComparisonCore = {
    configs,
    trials: args.trials,
    generatedAt: runTimestamp,
    probe: PROBE,
    judgeModel: JUDGE.apiModelId,
    estimate,
  };
  const result: ComparisonResult = {
    ...core,
    artifactPath: basename(artifactPath),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(core, null, 2)}\n`, "utf8");
  await writeFile(
    outputPath,
    renderComparisonReport(result, args.detail),
    "utf8",
  );

  // Historical benchmark: append a compact per-config point and archive the full
  // record gzipped, so the record is a time series, not a single snapshot — and
  // nothing is lost. Skipped under --fixture to keep the CI self-test byte-stable.
  if (!args.forceFixture) {
    await writeHistory(outputPath, core, runTimestamp, args.trials);
  }

  const measuredNow = fresh.filter((r) => r.provenance === "measured").length;
  const erroredTotal = configs.filter((r) => r.provenance === "error").length;
  process.stdout.write(
    `done: ${measuredNow}/${fresh.length} configs measured live this run; ` +
      `${configs.length} total in record, ${erroredTotal} errored.\n`,
  );
  process.stdout.write(`wrote ${outputPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

main().catch((error: unknown) => {
  process.stderr.write(`comparison failed: ${String(error)}\n`);
  process.exitCode = 1;
});
