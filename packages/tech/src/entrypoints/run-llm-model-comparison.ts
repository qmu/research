import { writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { MODELS } from "../llm-model-comparison/models";
import type {
  ComparisonResult,
  ModelCard,
  ModelRun,
  ProbeParams,
} from "../llm-model-comparison/domain/types";
import { buildRun, errorRun } from "../llm-model-comparison/run";
import { renderComparisonReport } from "../llm-model-comparison/domain/report";
import type { CompletionClient } from "../vendors/llm/types";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createFixtureCompletionClient } from "../vendors/llm/fixture";

// Thin entrypoint: own the probe/trial policy and the CLI/env/IO wiring, build
// each model's client, delegate the trial loop + aggregation to the pure-ish
// `run.ts` orchestration and the `domain/` statistics, then write the page + the
// raw JSON run-artifact. No comparison, scoring, or statistics logic lives here.

// Probe constants are orchestration policy, not domain truth — they live here and
// are echoed into the result for the Method section.
const PROBE: ProbeParams = {
  depthLadder: [3, 5, 8, 12, 16],
  lengthTargetWords: 100,
  lengthTopic: "the water cycle",
};

const DEFAULT_TRIALS = 5;

// A fixed timestamp for `--fixture` runs so the self-test report + artifact are
// byte-identical across runs (real runs stamp the wall clock).
const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const ENV_KEY: Record<ModelCard["provider"], string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
};

// Per-provider completion-client factory. A Record over the Provider union is
// exhaustive by construction — adding a provider to the union without a factory
// here is a compile error, which is the point.
const CLIENT_FACTORY: Record<
  ModelCard["provider"],
  (apiModelId: string, apiKey: string) => CompletionClient
> = {
  anthropic: createAnthropicCompletionClient,
  openai: createOpenAiCompletionClient,
  google: createGoogleCompletionClient,
};

// Build the live client for a provider, or undefined when the key is absent (the
// caller then uses the fixture path and flags the row fixtured).
const buildLiveClient = (card: ModelCard): CompletionClient | undefined => {
  const key = process.env[ENV_KEY[card.provider]];
  if (!key) {
    return undefined;
  }
  return CLIENT_FACTORY[card.provider](card.apiModelId, key);
};

// --- argument parsing (orchestration only) -----------------------------------

type Args = Readonly<{
  forceFixture: boolean;
  trials: number;
  modelIds: ReadonlyArray<string> | null; // null = all models
}>;

const parseArgs = (argv: ReadonlyArray<string>): Args => {
  const forceFixture = argv.includes("--fixture");
  const trialsIdx = argv.indexOf("--trials");
  const parsedTrials =
    trialsIdx >= 0 ? Number(argv[trialsIdx + 1]) : DEFAULT_TRIALS;
  const trials =
    Number.isFinite(parsedTrials) && parsedTrials >= 1
      ? Math.floor(parsedTrials)
      : DEFAULT_TRIALS;
  const modelsIdx = argv.indexOf("--models");
  const modelIds =
    modelsIdx >= 0 && argv[modelsIdx + 1]
      ? argv[modelsIdx + 1].split(",").map((s) => s.trim())
      : null;
  return { forceFixture, trials, modelIds };
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

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const models = selectModels(args.modelIds);
  if (models.length === 0) {
    process.stderr.write("no models selected; nothing to do\n");
    process.exitCode = 1;
    return;
  }

  const runs: ModelRun[] = [];
  for (const card of models) {
    try {
      runs.push(
        await buildRun(card, {
          trials: args.trials,
          probe: PROBE,
          liveClient: args.forceFixture ? undefined : buildLiveClient(card),
          fixtureFor: (i) => createFixtureCompletionClient(card.apiModelId, i),
        }),
      );
    } catch (error: unknown) {
      // A model that fails catastrophically is recorded and skipped, never fatal.
      process.stderr.write(`${card.modelName}: ${String(error)}\n`);
      runs.push(errorRun(card, args.trials, String(error)));
    }
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

  const core = {
    runs,
    trials: args.trials,
    generatedAt,
    probe: PROBE,
  };
  const result: ComparisonResult = {
    ...core,
    artifactPath: basename(artifactPath),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(core, null, 2)}\n`, "utf8");
  await writeFile(outputPath, renderComparisonReport(result), "utf8");

  for (const run of runs) {
    const s = run.stats;
    const summary =
      run.provenance === "measured"
        ? ` — ${s.tokensPerSecond.mean.toFixed(1)} tok/s, depth ${s.maxNestedJsonDepth.mean.toFixed(1)}, length ${(s.lengthAccuracy.mean * 100).toFixed(0)}% (n=${s.tokensPerSecond.n})`
        : "";
    process.stdout.write(
      `${run.provider}/${run.modelName}: ${run.provenance}${summary}\n`,
    );
  }
  process.stdout.write(`wrote ${outputPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

main().catch((error: unknown) => {
  process.stderr.write(`comparison failed: ${String(error)}\n`);
  process.exitCode = 1;
});
