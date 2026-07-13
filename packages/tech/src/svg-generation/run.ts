import type {
  CompletionClient,
  SvgGenerationClient,
} from "../vendors/llm/types";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";
import { createFixtureSvgGenerationClient } from "../vendors/llm/fixture";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createXaiCompletionClient } from "../vendors/llm/xai";
import { extractSvg } from "./domain/extract";
import { PROMPT_MANIFEST } from "./domain/manifest";
import {
  scoreAnimationPresence,
  scorePathComplexity,
  scoreRenderValidity,
  summarizeStat,
} from "./domain/score";
import type {
  SvgGenCallRecord,
  SvgGenModelRun,
  SvgGenerationResult,
  SvgModelCard,
  SvgPrompt,
} from "./domain/types";
import { NON_SUBJECT_PROVIDERS, SVG_MODELS } from "./models";

export type SvgGenerationRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Premises for the cost estimate: a compact instruction and a single SVG
// document per call. SVG output runs a few hundred tokens; these are catalog-
// priced approximations, refined once a real trial measures true token counts.
const EST_INPUT_TOKENS_PER_CALL = 220;
const EST_OUTPUT_TOKENS_PER_CALL = 900;

const KEY_ENV: Record<SvgModelCard["provider"], string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
};

const FORMAT_RULE =
  "Return only the SVG document, starting with <svg and ending with </svg>. No Markdown fences, no explanation.";

const buildPrompt = (prompt: SvgPrompt): string =>
  `${prompt.prompt}\n\n${FORMAT_RULE}`;

// An SvgGenerationClient over any text CompletionClient: complete, then unwrap
// the SVG from the model's prose/fences. This is why the topic needs no new
// vendor adapter — every provider's existing completion adapter drives it.
const svgClientFromCompletion = (
  client: CompletionClient,
): SvgGenerationClient => ({
  model: client.model,
  generateSvg: async (prompt) => {
    const completion = await client.complete(prompt, { maxTokens: 4000 });
    return {
      svg: extractSvg(completion.text),
      outputTokens: completion.outputTokens,
      elapsedMs: completion.elapsedMs,
      model: completion.model,
    };
  },
});

const generationClientFor = (
  card: SvgModelCard,
  fixture: boolean,
): SvgGenerationClient => {
  if (fixture) return createFixtureSvgGenerationClient(card.apiModelId);
  const keyEnv = KEY_ENV[card.provider];
  const key = process.env[keyEnv];
  if (!key) {
    throw new Error(`${keyEnv} is required for a real ${card.provider} run.`);
  }
  if (card.provider === "anthropic") {
    return svgClientFromCompletion(
      createAnthropicCompletionClient(card.apiModelId, key),
    );
  }
  if (card.provider === "openai") {
    return svgClientFromCompletion(
      createOpenAiCompletionClient(card.apiModelId, key),
    );
  }
  if (card.provider === "google") {
    return svgClientFromCompletion(
      createGoogleCompletionClient(card.apiModelId, key),
    );
  }
  return svgClientFromCompletion(
    createXaiCompletionClient(card.apiModelId, key),
  );
};

const runPromptOnce = async (
  client: SvgGenerationClient,
  prompt: SvgPrompt,
  repetition: number,
): Promise<SvgGenCallRecord> => {
  const generated = await client.generateSvg(buildPrompt(prompt));
  const base = {
    promptId: prompt.id,
    kind: prompt.kind,
    repetition,
    latencyMs: generated.elapsedMs,
    svgByteLength: Buffer.byteLength(generated.svg, "utf8"),
    outputTokens: generated.outputTokens,
    renderValid: scoreRenderValidity(generated.svg),
    pathComplexity: scorePathComplexity(generated.svg),
    svg: generated.svg,
  };
  return prompt.kind === "animated"
    ? { ...base, animationPresence: scoreAnimationPresence(generated.svg) }
    : base;
};

const aggregate = (
  card: SvgModelCard,
  provenance: SvgGenModelRun["provenance"],
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<SvgGenCallRecord>,
  error?: string,
): SvgGenModelRun => ({
  id: card.id,
  provider: card.provider,
  modelName: card.modelName,
  apiModelId: card.apiModelId,
  inputCostPerMTok: card.inputCostPerMTok,
  outputCostPerMTok: card.outputCostPerMTok,
  source: card.source,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    generationLatencyMs: summarizeStat(calls.map((call) => call.latencyMs)),
    renderValidity: summarizeStat(calls.map((call) => call.renderValid)),
    pathComplexity: summarizeStat(calls.map((call) => call.pathComplexity)),
    animationPresence: summarizeStat(
      calls
        .map((call) => call.animationPresence)
        .filter((value): value is number => value !== undefined),
    ),
  },
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<SvgModelCard> =>
  modelIds === undefined || modelIds.length === 0
    ? SVG_MODELS
    : SVG_MODELS.filter((card) => modelIds.includes(card.id));

export const runSvgGeneration = async (
  options: SvgGenerationRunOptions,
): Promise<SvgGenerationResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const runs: SvgGenModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const client = generationClientFor(card, options.fixture);
      const calls: SvgGenCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const prompt of PROMPT_MANIFEST.prompts) {
          calls.push(await runPromptOnce(client, prompt, repetition));
        }
      }
      runs.push(
        aggregate(
          card,
          options.fixture ? "fixtured" : "measured",
          generatedAt,
          trials,
          calls,
        ),
      );
    } catch (error) {
      runs.push(
        aggregate(card, "error", generatedAt, trials, [], String(error)),
      );
    }
  }
  return {
    generatedAt,
    fixture: options.fixture,
    trials,
    manifestVersion: PROMPT_MANIFEST.version,
    runs,
    nonSubjects: NON_SUBJECT_PROVIDERS,
    artifactPath: "svg-generation-comparison.data.json",
  };
};

export const estimateSvgGeneration = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const prompts = PROMPT_MANIFEST.prompts.length;
  const costOf = (card: SvgModelCard): number => {
    const calls = prompts * trialCount;
    return (
      (calls *
        (EST_INPUT_TOKENS_PER_CALL * card.inputCostPerMTok +
          EST_OUTPUT_TOKENS_PER_CALL * card.outputCostPerMTok)) /
      1_000_000
    );
  };
  const cards = selectedCards(modelIds);
  const lines = cards.map((card) => {
    const calls = prompts * trialCount;
    return `  ${card.id}: ~$${costOf(card).toFixed(4)} for ${calls} generation(s) (${prompts} prompt(s) × ${trialCount} repetition(s))`;
  });
  const total = cards.reduce((sum, card) => sum + costOf(card), 0);
  return [
    "svg-generation estimate (real run; token counts are approximations):",
    ...lines,
    `  total: ~$${total.toFixed(4)} (agreed ceiling: $5/trial — stop for re-approval above it)`,
    "No persistent provider resources are created; SVG is generated in memory and scored mechanically.",
  ].join("\n");
};
