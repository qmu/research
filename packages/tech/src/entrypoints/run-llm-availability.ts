import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { MODELS } from "../llm-model-comparison/models";
import type {
  HistoryFile,
  ModelCard,
  Provider,
} from "../llm-model-comparison/domain/types";
import {
  AVAILABILITY_ESTIMATE_INPUT_TOKENS,
  AVAILABILITY_ESTIMATE_OUTPUT_TOKENS,
  DEFAULT_AVAILABILITY_SAMPLING_SPEC,
  type AvailabilityHistoryPoint,
  type AvailabilitySample,
  type AvailabilitySamplingSpec,
  type AvailabilitySummary,
  type ObservationWindow,
  summarizeAvailability,
  toAvailabilityHistoryPoint,
} from "../llm-model-comparison/domain/availability";
import {
  appendHistory,
  buildAvailabilityHistoryEntry,
} from "../llm-model-comparison/domain/history";
import { renderAvailabilityReport } from "../llm-model-comparison/domain/availability-report";
import type { EffortLevel } from "../llm-model-comparison/domain/effort";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createOpenAiResponsesCompletionClient } from "../vendors/llm/openai-responses";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createXaiCompletionClient } from "../vendors/llm/xai";
import { probeLlmHealth, type HealthProbeTarget } from "../vendors/llm/health";
import type { CompletionClient } from "../vendors/llm/types";

type Args = Readonly<{
  fixture: boolean;
  estimateOnly: boolean;
  samples: number;
  origin: string | null;
}>;

type AvailabilityTarget = Readonly<{
  provider: Provider;
  card: ModelCard;
  effort: EffortLevel;
}>;

type AvailabilityRunArtifact = Readonly<{
  generatedAt: string;
  samplingSpec: AvailabilitySamplingSpec;
  targets: ReadonlyArray<{
    provider: Provider;
    modelId: string;
    modelName: string;
    apiModelId: string;
    effort: EffortLevel;
  }>;
  samples: ReadonlyArray<AvailabilitySample>;
  summaries: ReadonlyArray<AvailabilitySummary>;
  fixture: boolean;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const ENV_KEY: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
};

const CLIENT_FACTORY: Record<
  Provider,
  (apiModelId: string, apiKey: string) => CompletionClient
> = {
  anthropic: createAnthropicCompletionClient,
  openai: createOpenAiCompletionClient,
  google: createGoogleCompletionClient,
  xai: createXaiCompletionClient,
};

const parseArgs = (argv: ReadonlyArray<string>): Args => {
  const sampleIdx = argv.indexOf("--samples");
  const parsedSamples =
    sampleIdx >= 0 ? Number(argv[sampleIdx + 1]) : undefined;
  const samples =
    parsedSamples !== undefined &&
    Number.isFinite(parsedSamples) &&
    parsedSamples >= 1
      ? Math.floor(parsedSamples)
      : DEFAULT_AVAILABILITY_SAMPLING_SPEC.samplesPerProvider;
  const originIdx = argv.indexOf("--origin");
  return {
    fixture: argv.includes("--fixture"),
    estimateOnly: argv.includes("--estimate"),
    samples,
    origin: originIdx >= 0 && argv[originIdx + 1] ? argv[originIdx + 1] : null,
  };
};

const chooseEffort = (card: ModelCard): EffortLevel => {
  if (card.effortLevels.includes("none")) return "none";
  if (card.effortLevels.includes("n/a")) return "n/a";
  if (card.effortLevels.includes("low")) return "low";
  return card.effortLevels[0];
};

const targetScore = (card: ModelCard): number =>
  card.inputCostPerMTok + card.outputCostPerMTok;

const availabilityTargets = (): ReadonlyArray<AvailabilityTarget> => {
  const selected = new Map<Provider, ModelCard>();
  for (const card of MODELS) {
    if (card.api === "realtime" || card.api === "responses") continue;
    const current = selected.get(card.provider);
    if (current === undefined || targetScore(card) < targetScore(current)) {
      selected.set(card.provider, card);
    }
  }
  return [...selected.values()]
    .sort((a, b) => a.provider.localeCompare(b.provider))
    .map((card) => ({
      provider: card.provider,
      card,
      effort: chooseEffort(card),
    }));
};

const buildSamplingSpec = (args: Args): AvailabilitySamplingSpec => ({
  ...DEFAULT_AVAILABILITY_SAMPLING_SPEC,
  samplesPerProvider: args.samples,
  requestOrigin:
    args.origin ??
    process.env.AVAILABILITY_REQUEST_ORIGIN ??
    DEFAULT_AVAILABILITY_SAMPLING_SPEC.requestOrigin,
});

const estimateUsd = (
  targets: ReadonlyArray<AvailabilityTarget>,
  samples: number,
): number =>
  targets.reduce(
    (sum, target) =>
      sum +
      samples *
        ((AVAILABILITY_ESTIMATE_INPUT_TOKENS * target.card.inputCostPerMTok) /
          1_000_000 +
          (AVAILABILITY_ESTIMATE_OUTPUT_TOKENS *
            target.card.outputCostPerMTok) /
            1_000_000),
    0,
  );

const printEstimate = (
  targets: ReadonlyArray<AvailabilityTarget>,
  spec: AvailabilitySamplingSpec,
): void => {
  const calls = targets.length * spec.samplesPerProvider;
  const etaMs =
    (spec.samplesPerProvider - 1) * spec.intervalMs +
    spec.samplesPerProvider * spec.timeoutMs;
  process.stdout.write(
    `Availability pre-run estimate: ${targets.length} providers × ` +
      `${spec.samplesPerProvider} samples → ${calls} API calls, ` +
      `~$${estimateUsd(targets, spec.samplesPerProvider).toFixed(4)}, ` +
      `manual observation window ~${Math.ceil(etaMs / 1000)}s. ` +
      `Use --estimate to make no provider calls.\n`,
  );
};

const buildLiveClient = (card: ModelCard): CompletionClient => {
  const key = process.env[ENV_KEY[card.provider]];
  if (!key) {
    throw new Error(
      `missing ${ENV_KEY[card.provider]} for ${card.provider}; use --fixture for the keyless path`,
    );
  }
  if (card.api === "responses") {
    return createOpenAiResponsesCompletionClient(card.apiModelId, key);
  }
  return CLIENT_FACTORY[card.provider](card.apiModelId, key);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const fixtureObservedAt = (
  baseTimestamp: string,
  intervalMs: number,
  sampleIndex: number,
): string =>
  new Date(Date.parse(baseTimestamp) + intervalMs * sampleIndex).toISOString();

const fixtureSamples = (
  targets: ReadonlyArray<AvailabilityTarget>,
  spec: AvailabilitySamplingSpec,
  generatedAt: string,
): AvailabilitySample[] => {
  const samples: AvailabilitySample[] = [];
  targets.forEach((target, targetIndex) => {
    for (let i = 0; i < spec.samplesPerProvider; i += 1) {
      samples.push({
        provider: target.provider,
        targetModelId: target.card.id,
        targetModelName: target.card.modelName,
        observedAt: fixtureObservedAt(generatedAt, spec.intervalMs, i),
        ok: true,
        responseTimeMs: 90 + targetIndex * 17 + i * 5,
        failureType: null,
      });
    }
  });
  return samples;
};

const realSamples = async (
  targets: ReadonlyArray<AvailabilityTarget>,
  spec: AvailabilitySamplingSpec,
): Promise<AvailabilitySample[]> => {
  const probeTargets: HealthProbeTarget[] = targets.map((target) => ({
    provider: target.provider,
    targetModelId: target.card.id,
    targetModelName: target.card.modelName,
    effort: target.effort,
    client: buildLiveClient(target.card),
  }));
  const samples: AvailabilitySample[] = [];
  for (let i = 0; i < spec.samplesPerProvider; i += 1) {
    const round = await Promise.all(
      probeTargets.map((target) => probeLlmHealth(target, spec)),
    );
    samples.push(...round);
    if (i < spec.samplesPerProvider - 1) {
      await sleep(spec.intervalMs);
    }
  }
  return samples;
};

const observationWindowFor = (
  samples: ReadonlyArray<AvailabilitySample>,
): ObservationWindow => {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const startedAtMs = Date.parse(first.observedAt);
  const endedAtMs = Date.parse(last.observedAt);
  const lastProbeMs = last.responseTimeMs ?? 0;
  return {
    startedAt: first.observedAt,
    endedAt: last.observedAt,
    durationMs: Math.max(0, endedAtMs - startedAtMs) + lastProbeMs,
  };
};

const summarizeByProvider = (
  samples: ReadonlyArray<AvailabilitySample>,
  targets: ReadonlyArray<AvailabilityTarget>,
  spec: AvailabilitySamplingSpec,
): AvailabilitySummary[] =>
  targets.map((target) => {
    const providerSamples = samples.filter(
      (sample) => sample.provider === target.provider,
    );
    return summarizeAvailability(
      providerSamples,
      spec,
      observationWindowFor(providerSamples),
    );
  });

const historyPathFor = (canonicalMdPath: string): string =>
  canonicalMdPath.replace(/\.md$/, ".history.json");

const readHistoryFile = async (
  canonicalMdPath: string,
): Promise<HistoryFile | null> => {
  try {
    return JSON.parse(
      await readFile(historyPathFor(canonicalMdPath), "utf8"),
    ) as HistoryFile;
  } catch {
    return null;
  }
};

const writeHistoryFile = async (
  canonicalMdPath: string,
  history: HistoryFile,
): Promise<void> => {
  await writeFile(
    historyPathFor(canonicalMdPath),
    `${JSON.stringify(history, null, 2)}\n`,
    "utf8",
  );
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const targets = availabilityTargets();
  const spec = buildSamplingSpec(args);
  printEstimate(targets, spec);
  if (args.estimateOnly) {
    process.stdout.write("--estimate: dry run, no API calls made.\n");
    return;
  }

  const generatedAt = args.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const canonicalComparisonPath = resolve(
    process.cwd(),
    "../../docs/research-reports/llm-model-comparison.md",
  );
  const reportPath = resolve(
    process.cwd(),
    "../../docs/research-reports/llm-availability.md",
  );
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");

  const samples = args.fixture
    ? fixtureSamples(targets, spec, generatedAt)
    : await realSamples(targets, spec);
  const summaries = summarizeByProvider(samples, targets, spec);
  const artifact: AvailabilityRunArtifact = {
    generatedAt,
    samplingSpec: spec,
    targets: targets.map((target) => ({
      provider: target.provider,
      modelId: target.card.id,
      modelName: target.card.modelName,
      apiModelId: target.card.apiModelId,
      effort: target.effort,
    })),
    samples,
    summaries,
    fixture: args.fixture,
  };

  let history = await readHistoryFile(canonicalComparisonPath);
  if (!args.fixture) {
    const points: AvailabilityHistoryPoint[] = summaries.map((summary) =>
      toAvailabilityHistoryPoint(summary, generatedAt, spec),
    );
    history = appendHistory(
      history,
      buildAvailabilityHistoryEntry(points, generatedAt),
    );
    await writeHistoryFile(canonicalComparisonPath, history);
  }

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    reportPath,
    renderAvailabilityReport(
      {
        generatedAt,
        samplingSpec: spec,
        summaries,
        artifactPath: basename(artifactPath),
        fixture: args.fixture,
      },
      history ?? undefined,
    ),
    "utf8",
  );
  process.stdout.write(`wrote ${reportPath}\n`);
  process.stdout.write(`wrote ${artifactPath}\n`);
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`availability probe failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
