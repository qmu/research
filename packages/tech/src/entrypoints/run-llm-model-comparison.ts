import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MODELS } from "../llm-model-comparison/models";
import type {
  ComparisonRow,
  Measurement,
  ModelCard,
  ProbeParams,
} from "../llm-model-comparison/domain/types";
import {
  buildNestedJsonPrompt,
  gradeNestedJson,
} from "../llm-model-comparison/domain/nested-json";
import {
  buildLengthPrompt,
  lengthAccuracy,
  wordCount,
} from "../llm-model-comparison/domain/length-accuracy";
import { tokensPerSecond } from "../llm-model-comparison/domain/speed";
import { renderComparisonReport } from "../llm-model-comparison/domain/report";
import type { CompletionClient } from "../vendors/llm/types";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createFixtureCompletionClient } from "../vendors/llm/fixture";

// Thin entrypoint: own the probe constants, build each model's client, run the
// probes through the pure domain logic, assemble rows, render the result page,
// and write it. No comparison or correctness logic lives here.

// Probe constants are orchestration policy, not domain truth — they live here and
// are echoed into the result for the Method section.
const PROBE: ProbeParams = {
  depthLadder: [3, 5, 8, 12, 16],
  lengthTargetWords: 100,
  lengthTopic: "the water cycle",
};

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
// caller then substitutes the fixture client and flags the row not-measured).
const buildLiveClient = (card: ModelCard): CompletionClient | undefined => {
  const key = process.env[ENV_KEY[card.provider]];
  if (!key) {
    return undefined;
  }
  return CLIENT_FACTORY[card.provider](card.apiModelId, key);
};

// Run the nested-JSON ladder, recording the deepest correctly-nested response.
const probeJsonDepth = async (
  client: CompletionClient,
): Promise<{ maxDepth: number; elapsedMs: number; outputTokens: number }> => {
  let maxDepth = 0;
  let elapsedMs = 0;
  let outputTokens = 0;
  for (const target of PROBE.depthLadder) {
    const completion = await client.complete(buildNestedJsonPrompt(target));
    elapsedMs += completion.elapsedMs;
    outputTokens += completion.outputTokens;
    const grade = gradeNestedJson(target, completion.text);
    if (grade.success && target > maxDepth) {
      maxDepth = target;
    }
  }
  return { maxDepth, elapsedMs, outputTokens };
};

// Run the length probe once, scoring how close the response is to the target.
const probeLength = async (
  client: CompletionClient,
): Promise<{ accuracy: number; elapsedMs: number; outputTokens: number }> => {
  const completion = await client.complete(
    buildLengthPrompt(PROBE.lengthTargetWords, PROBE.lengthTopic),
    { topic: PROBE.lengthTopic },
  );
  return {
    accuracy: lengthAccuracy(
      PROBE.lengthTargetWords,
      wordCount(completion.text),
    ),
    elapsedMs: completion.elapsedMs,
    outputTokens: completion.outputTokens,
  };
};

const measure = async (
  client: CompletionClient,
  live: boolean,
): Promise<Measurement> => {
  const json = await probeJsonDepth(client);
  const length = await probeLength(client);
  const elapsedMs = json.elapsedMs + length.elapsedMs;
  const outputTokens = json.outputTokens + length.outputTokens;
  // Zero-token guard: if a live call returned no usable token count, downgrade
  // the row to not-measured rather than letting tokensPerSecond report a corrupt
  // rate.
  const measured = live && outputTokens > 0 && elapsedMs > 0;
  return {
    measured,
    tokensPerSecond: tokensPerSecond(outputTokens, elapsedMs),
    maxNestedJsonDepth: json.maxDepth,
    lengthAccuracy: length.accuracy,
    elapsedMs,
    outputTokens,
  };
};

const buildRow = async (card: ModelCard): Promise<ComparisonRow> => {
  const forceFixture = process.argv.includes("--fixture");
  const liveClient = forceFixture ? undefined : buildLiveClient(card);
  if (!liveClient && !forceFixture) {
    process.stderr.write(
      `${ENV_KEY[card.provider]} not set; ${card.modelName} row is fixtured.\n`,
    );
  }
  const client = liveClient ?? createFixtureCompletionClient(card.apiModelId);
  const measurement = await measure(client, liveClient !== undefined);
  return { ...card, measurement };
};

const main = async (): Promise<void> => {
  const rows: ComparisonRow[] = [];
  for (const card of MODELS) {
    rows.push(await buildRow(card));
  }

  const result = {
    rows,
    generatedAt: new Date().toISOString(),
    probe: PROBE,
  };
  const page = renderComparisonReport(result);

  const outputPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/llm-model-comparison.md",
    );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, page, "utf8");

  for (const row of rows) {
    const m = row.measurement;
    const flag = m.measured ? "measured" : "fixtured";
    process.stdout.write(
      `${row.provider}/${row.modelName}: ${flag}` +
        (m.measured
          ? ` — ${m.tokensPerSecond.toFixed(1)} tok/s, depth ${m.maxNestedJsonDepth}, length ${(m.lengthAccuracy * 100).toFixed(0)}%`
          : "") +
        "\n",
    );
  }
  process.stdout.write(`wrote ${outputPath}\n`);
};

main().catch((error: unknown) => {
  process.stderr.write(`comparison failed: ${String(error)}\n`);
  process.exitCode = 1;
});
