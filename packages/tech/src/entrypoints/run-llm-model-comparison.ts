import { writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { MODELS } from "../llm-model-comparison/models";
import type {
  ComparisonResult,
  ConfigRun,
  ModelCard,
  ProbeParams,
  RunEstimate,
} from "../llm-model-comparison/domain/types";
import { buildConfigRun, errorRun } from "../llm-model-comparison/run";
import type { JudgeConfig } from "../llm-model-comparison/run";
import { renderComparisonReport } from "../llm-model-comparison/domain/report";
import type { DetailLevel } from "../llm-model-comparison/domain/report";
import { buildLatencyPrompt } from "../llm-model-comparison/domain/latency";
import { escalatingLadder } from "../llm-model-comparison/domain/json-schema";
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

// Probe constants are orchestration policy, not domain truth — they live here and
// are echoed into the result for the Method section.
const PROBE: ProbeParams = {
  throughputTargetWords: 400,
  throughputTopic: "how large language models generate text",
  latencyPrompt: buildLatencyPrompt("the water cycle"),
  schemaLadder: escalatingLadder(6),
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
const ESTIMATE_AVG_INPUT_TOKENS = 150;
const ESTIMATE_AVG_OUTPUT_TOKENS = 700;
const ESTIMATE_JUDGE_INPUT_TOKENS = 1500;
const ESTIMATE_JUDGE_OUTPUT_TOKENS = 200;
const ESTIMATE_SECONDS_PER_CALL = 4;

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

const probeCallsPerConfig = (probe: ProbeParams, trials: number): number =>
  // throughput + latency + schema-ladder + length, per trial
  (3 + probe.schemaLadder.length) * trials;

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

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const models = selectModels(args.modelIds);
  if (models.length === 0) {
    process.stderr.write("no models selected; nothing to do\n");
    process.exitCode = 1;
    return;
  }
  const matrix = buildMatrix(models, args.efforts);
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

  const configs: ConfigRun[] = [];
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
      });
    } catch (error: unknown) {
      // A configuration that fails catastrophically is recorded and skipped.
      process.stderr.write(`${card.modelName} (${effort}): ${String(error)}\n`);
      run = errorRun(card, effort, args.trials, String(error), JUDGE.apiModelId);
    }
    configs.push(run);
    done += 1;
    // Stream per-config progress the moment each config finishes, so a long real
    // sweep is observable instead of silent until the very end.
    const s = run.stats;
    const line =
      run.provenance === "measured"
        ? `${s.throughputTokensPerSec.mean.toFixed(0)} tok/s, ttft ${s.ttftMs.mean.toFixed(0)}ms, schema ${s.maxSchemaComplexity.mean.toFixed(1)}, length ${(s.lengthAccuracy.mean * 100).toFixed(0)}%`
        : run.provenance;
    process.stderr.write(
      `[${done}/${matrix.length}] ${run.provider}/${run.modelName} [${run.effort}]: ${line}\n`,
    );
  }

  const generatedAt = args.forceFixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();

  const outputPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/llm-model-comparison.md",
    );
  const artifactPath = outputPath.replace(/\.md$/, ".data.json");

  // The artifact is the COMPLETE record — every configuration, trial, and call
  // captured verbatim — so a report can be regenerated at any detail level from
  // it without re-running the (costly) sweep.
  const core = {
    configs,
    trials: args.trials,
    generatedAt,
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

  const measuredCount = configs.filter(
    (r) => r.provenance === "measured",
  ).length;
  process.stdout.write(
    `done: ${measuredCount}/${configs.length} configs measured live.\n`,
  );
  process.stdout.write(`wrote ${outputPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

main().catch((error: unknown) => {
  process.stderr.write(`comparison failed: ${String(error)}\n`);
  process.exitCode = 1;
});
