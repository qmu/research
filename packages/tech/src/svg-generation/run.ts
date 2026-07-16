import type {
  CompletionClient,
  JsonSchema,
  SvgGenerationClient,
  VisionClient,
} from "../vendors/llm/types";
import {
  ANTHROPIC_VISION_CAPABILITY,
  createAnthropicCompletionClient,
  createAnthropicVisionClient,
} from "../vendors/llm/anthropic";
import { createFixtureSvgGenerationClient } from "../vendors/llm/fixture";
import { createGoogleCompletionClient } from "../vendors/llm/google";
import { createOpenAiCompletionClient } from "../vendors/llm/openai";
import { createXaiCompletionClient } from "../vendors/llm/xai";
import { createFixtureSvgRasterizer } from "../vendors/raster/fixture";
import type { RasterizedSvg, SvgRasterizer } from "../vendors/raster/types";
import { extractSvg } from "./domain/extract";
import { PROMPT_MANIFEST } from "./domain/manifest";
import {
  scoreAnimationPresence,
  scorePathComplexity,
  scorePromptFidelity,
  scoreRenderValidity,
  summarizeStat,
} from "./domain/score";
import type {
  SvgGenCallRecord,
  SvgGenModelRun,
  SvgGenerationResult,
  SvgJudgeAnswer,
  SvgModelCard,
  SvgPrompt,
} from "./domain/types";
import { JUDGE_MODEL_ID, NON_SUBJECT_PROVIDERS, SVG_MODELS } from "./models";

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

// One fidelity-judge read per generated SVG: the rasterized still (~1600
// image-input tokens) plus a compact JSON verdict, at the judge model's catalog
// prices — the same premises as the image-generation topic's judge estimate.
const JUDGE_INPUT_TOKENS_PER_SVG = 1_600;
const JUDGE_OUTPUT_TOKENS_PER_SVG = 120;
const JUDGE_INPUT_USD_PER_MTOK = 3;
const JUDGE_OUTPUT_USD_PER_MTOK = 15;

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

// ── The prompt-fidelity instrument: rasterize, then ask the fixed judge ──────

const RUBRIC_SCHEMA = (prompt: SvgPrompt): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  required: ["answers"],
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["constraintId", "satisfied"],
        properties: {
          constraintId: {
            type: "string",
            enum: prompt.constraints.map((constraint) => constraint.id),
          },
          satisfied: { type: "boolean" },
        },
      },
    },
  },
});

const rubricInstruction = (prompt: SvgPrompt): string =>
  [
    "You are grading one rasterized SVG drawing against a checklist.",
    "Answer every question strictly from what is visible in this still image. Return only JSON matching the schema.",
    ...prompt.constraints.map(
      (constraint) => `- ${constraint.id}: ${constraint.question}`,
    ),
  ].join("\n");

/** The fixed judge over one rasterized SVG: rubric answers only. Implemented
 * over the real vision port, or deterministically on the keyless fixture path
 * (all constraints satisfied) — the same convention as the image-generation
 * judge. */
export type SvgJudge = Readonly<{
  model: string;
  rubric: (
    image: RasterizedSvg,
    prompt: SvgPrompt,
  ) => Promise<ReadonlyArray<SvgJudgeAnswer>>;
}>;

const parseAnswers = (raw: string): ReadonlyArray<SvgJudgeAnswer> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const answers = (parsed as { answers?: unknown }).answers;
    if (!Array.isArray(answers)) return [];
    return answers.flatMap((entry) => {
      const candidate = entry as {
        constraintId?: unknown;
        satisfied?: unknown;
      };
      return typeof candidate.constraintId === "string" &&
        typeof candidate.satisfied === "boolean"
        ? [
            {
              constraintId: candidate.constraintId,
              satisfied: candidate.satisfied,
            },
          ]
        : [];
    });
  } catch {
    return [];
  }
};

const createRealJudge = (client: VisionClient): SvgJudge => ({
  model: client.model,
  rubric: async (image, prompt) => {
    const structured = await client.completeVisionStructured(
      {
        instruction: rubricInstruction(prompt),
        images: [{ base64: image.base64, mimeType: image.mimeType }],
      },
      RUBRIC_SCHEMA(prompt),
      { maxTokens: 512 },
    );
    return parseAnswers(structured.raw);
  },
});

// Echoes a perfect judgement (all constraints satisfied) so the real scoring
// path runs end to end on the keyless fixture — mirroring the image-generation
// fixture judge. Exported for unit tests over the fidelity pipeline.
export const createFixtureJudge = (): SvgJudge => ({
  model: "fixture-judge",
  rubric: (_image, prompt) =>
    Promise.resolve(
      prompt.constraints.map((constraint) => ({
        constraintId: constraint.id,
        satisfied: true,
      })),
    ),
});

const judgeFor = (fixture: boolean): SvgJudge => {
  if (fixture) return createFixtureJudge();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for the real vision judge.");
  }
  return createRealJudge(
    createAnthropicVisionClient(
      JUDGE_MODEL_ID,
      key,
      ANTHROPIC_VISION_CAPABILITY,
    ),
  );
};

// The keyless path never loads the native engine: the fixture rasterizer is a
// pure stub, and the real engine (@resvg/resvg-js) is imported only when a real
// run asks for it.
const rasterizerFor = async (fixture: boolean): Promise<SvgRasterizer> => {
  if (fixture) return createFixtureSvgRasterizer();
  const { createResvgRasterizer } = await import("../vendors/raster/resvg");
  return createResvgRasterizer();
};

/** Rasterize one generated SVG and score rubric adherence with the fixed
 * vision judge. A source that failed the structural parse — or that the engine
 * cannot render — scores 0 with no judge read: a malformed SVG lowers the
 * score, it never crashes the run. Exported for unit tests. */
export const judgeSvgFidelity = async (
  svg: string,
  renderValid: number,
  prompt: SvgPrompt,
  rasterizer: SvgRasterizer,
  judge: SvgJudge,
): Promise<
  Readonly<{
    promptFidelity: number;
    judgeAnswers?: ReadonlyArray<SvgJudgeAnswer>;
  }>
> => {
  if (renderValid !== 1) return { promptFidelity: 0 };
  let raster: RasterizedSvg;
  try {
    raster = await rasterizer.rasterize(svg);
  } catch {
    return { promptFidelity: 0 };
  }
  const answers = await judge.rubric(raster, prompt);
  return {
    promptFidelity: scorePromptFidelity(prompt.constraints, answers),
    judgeAnswers: answers,
  };
};

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
  rasterizer: SvgRasterizer,
  judge: SvgJudge,
  prompt: SvgPrompt,
  repetition: number,
): Promise<SvgGenCallRecord> => {
  const generated = await client.generateSvg(buildPrompt(prompt));
  const renderValid = scoreRenderValidity(generated.svg);
  const fidelity = await judgeSvgFidelity(
    generated.svg,
    renderValid,
    prompt,
    rasterizer,
    judge,
  );
  const base = {
    promptId: prompt.id,
    kind: prompt.kind,
    repetition,
    latencyMs: generated.elapsedMs,
    svgByteLength: Buffer.byteLength(generated.svg, "utf8"),
    outputTokens: generated.outputTokens,
    renderValid,
    pathComplexity: scorePathComplexity(generated.svg),
    promptFidelity: fidelity.promptFidelity,
    ...(fidelity.judgeAnswers === undefined
      ? {}
      : { judgeAnswers: fidelity.judgeAnswers }),
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
    promptFidelity: summarizeStat(calls.map((call) => call.promptFidelity)),
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
  const judge = judgeFor(options.fixture);
  const rasterizer = await rasterizerFor(options.fixture);
  const runs: SvgGenModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const client = generationClientFor(card, options.fixture);
      const calls: SvgGenCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const prompt of PROMPT_MANIFEST.prompts) {
          calls.push(
            await runPromptOnce(client, rasterizer, judge, prompt, repetition),
          );
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
    judgeModel: judge.model,
    rasterizer: rasterizer.engine,
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
  const judgePerSvg =
    (JUDGE_INPUT_TOKENS_PER_SVG * JUDGE_INPUT_USD_PER_MTOK +
      JUDGE_OUTPUT_TOKENS_PER_SVG * JUDGE_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const costOf = (card: SvgModelCard): number => {
    const calls = prompts * trialCount;
    return (
      (calls *
        (EST_INPUT_TOKENS_PER_CALL * card.inputCostPerMTok +
          EST_OUTPUT_TOKENS_PER_CALL * card.outputCostPerMTok)) /
        1_000_000 +
      calls * judgePerSvg
    );
  };
  const cards = selectedCards(modelIds);
  const lines = cards.map((card) => {
    const calls = prompts * trialCount;
    return `  ${card.id}: ~$${costOf(card).toFixed(4)} for ${calls} generation(s) (${prompts} prompt(s) × ${trialCount} repetition(s)) + fidelity-judge reads`;
  });
  const total = cards.reduce((sum, card) => sum + costOf(card), 0);
  return [
    "svg-generation estimate (real run; token counts are approximations):",
    ...lines,
    `  total: ~$${total.toFixed(4)} (agreed ceiling: $5/trial — stop for re-approval above it)`,
    `Each generated SVG is rasterized locally (no cost) and read once by the fixed ${JUDGE_MODEL_ID} judge (~${JUDGE_INPUT_TOKENS_PER_SVG} input + ${JUDGE_OUTPUT_TOKENS_PER_SVG} output tokens, included above).`,
    "No persistent provider resources are created; SVG is generated in memory and scored mechanically.",
  ].join("\n");
};
