import type {
  ImageGenerationClient,
  JsonSchema,
  VisionClient,
  VisionMimeType,
} from "../vendors/llm/types";
import {
  ANTHROPIC_VISION_CAPABILITY,
  createAnthropicVisionClient,
} from "../vendors/llm/anthropic";
import { createFixtureImageGenerationClient } from "../vendors/llm/fixture";
import { createGoogleImageGenerationClient } from "../vendors/llm/google";
import { createOpenAiImageGenerationClient } from "../vendors/llm/openai";
import { createXaiImageGenerationClient } from "../vendors/llm/xai";
import { PROMPT_MANIFEST } from "./domain/manifest";
import {
  scorePromptAdherence,
  scoreTextRenderAccuracy,
  summarizeStat,
} from "./domain/score";
import type {
  ImageGenCallRecord,
  ImageGenerationResult,
  ImageGenModelRun,
  ImageModelCard,
  ImagePrompt,
  JudgeAnswer,
} from "./domain/types";
import { IMAGE_MODELS, JUDGE_MODEL_ID, NON_SUBJECT_PROVIDERS } from "./models";

export type ImageGenerationRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Estimate premises: one judge read per generated image, ~1600 image-input
// tokens + ~120 output tokens at the judge model's catalog prices.
const JUDGE_INPUT_TOKENS_PER_IMAGE = 1_600;
const JUDGE_OUTPUT_TOKENS_PER_IMAGE = 120;
const JUDGE_INPUT_USD_PER_MTOK = 3;
const JUDGE_OUTPUT_USD_PER_MTOK = 15;

const RUBRIC_SCHEMA = (prompt: ImagePrompt): JsonSchema => ({
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

const rubricInstruction = (prompt: ImagePrompt): string =>
  [
    "You are grading one generated image against a checklist.",
    "Answer every question strictly from what is visible. Return only JSON matching the schema.",
    ...prompt.constraints.map(
      (constraint) => `- ${constraint.id}: ${constraint.question}`,
    ),
  ].join("\n");

const TRANSCRIBE_INSTRUCTION =
  "Transcribe the text rendered in this image exactly as written. Return only the transcription.";

/** The judge over one generated image: rubric answers or a transcription.
 * Implemented over the real vision port, or deterministically on the keyless
 * fixture path (all constraints satisfied, expected text echoed) — mirroring
 * how the OCR fixture echoes its reference text. */
type Judge = Readonly<{
  model: string;
  rubric: (
    image: Readonly<{ base64: string; mimeType: VisionMimeType }>,
    prompt: ImagePrompt,
  ) => Promise<ReadonlyArray<JudgeAnswer>>;
  transcribe: (
    image: Readonly<{ base64: string; mimeType: VisionMimeType }>,
    prompt: ImagePrompt,
  ) => Promise<string>;
}>;

const parseAnswers = (raw: string): ReadonlyArray<JudgeAnswer> => {
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

const createRealJudge = (client: VisionClient): Judge => ({
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
  transcribe: async (image, _prompt) => {
    const completion = await client.completeVision(
      {
        instruction: TRANSCRIBE_INSTRUCTION,
        images: [{ base64: image.base64, mimeType: image.mimeType }],
      },
      { maxTokens: 256 },
    );
    return completion.text;
  },
});

// Echoes a perfect judgement (all constraints satisfied, expected text
// returned) so the real scoring path runs end to end on the keyless fixture —
// the same convention as the OCR fixture echoing its reference text.
const createFixtureJudge = (): Judge => ({
  model: "fixture-judge",
  rubric: (_image, prompt) =>
    Promise.resolve(
      prompt.constraints.map((constraint) => ({
        constraintId: constraint.id,
        satisfied: true,
      })),
    ),
  transcribe: (_image, prompt) => Promise.resolve(prompt.expectedText ?? ""),
});

const generationClientFor = (
  card: ImageModelCard,
  fixture: boolean,
): ImageGenerationClient => {
  if (fixture) return createFixtureImageGenerationClient(card.apiModelId);
  const keyEnv = {
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    xai: "XAI_API_KEY",
  }[card.provider];
  const key = process.env[keyEnv];
  if (!key) {
    throw new Error(`${keyEnv} is required for a real ${card.provider} run.`);
  }
  if (card.provider === "openai") {
    return createOpenAiImageGenerationClient(card.apiModelId, key);
  }
  if (card.provider === "google") {
    return createGoogleImageGenerationClient(card.apiModelId, key);
  }
  return createXaiImageGenerationClient(card.apiModelId, key);
};

const judgeFor = (fixture: boolean): Judge => {
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

const byteLengthOfBase64 = (base64: string): number =>
  Math.floor((base64.replace(/=+$/, "").length * 3) / 4);

const runPromptOnce = async (
  client: ImageGenerationClient,
  judge: Judge,
  prompt: ImagePrompt,
  repetition: number,
): Promise<ImageGenCallRecord> => {
  const image = await client.generateImage(prompt.prompt);
  const base = {
    promptId: prompt.id,
    kind: prompt.kind,
    repetition,
    latencyMs: image.elapsedMs,
    imageByteLength: byteLengthOfBase64(image.base64),
    imageMimeType: image.mimeType,
  };
  if (prompt.kind === "adherence") {
    const answers = await judge.rubric(image, prompt);
    return {
      ...base,
      judgeAnswers: answers,
      promptAdherence: scorePromptAdherence(prompt, answers),
    };
  }
  const transcription = await judge.transcribe(image, prompt);
  return {
    ...base,
    judgeTranscription: transcription,
    textRenderAccuracy: scoreTextRenderAccuracy(
      prompt.expectedText ?? "",
      transcription,
    ),
  };
};

const aggregate = (
  card: ImageModelCard,
  provenance: ImageGenModelRun["provenance"],
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<ImageGenCallRecord>,
  error?: string,
): ImageGenModelRun => ({
  id: card.id,
  provider: card.provider,
  modelName: card.modelName,
  apiModelId: card.apiModelId,
  pricePerImageUsd: card.pricePerImageUsd,
  sizeTier: card.sizeTier,
  source: card.source,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    generationLatencyMs: summarizeStat(calls.map((call) => call.latencyMs)),
    promptAdherence: summarizeStat(
      calls
        .map((call) => call.promptAdherence)
        .filter((value): value is number => value !== undefined),
    ),
    textRenderAccuracy: summarizeStat(
      calls
        .map((call) => call.textRenderAccuracy)
        .filter((value): value is number => value !== undefined),
    ),
  },
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<ImageModelCard> =>
  modelIds === undefined || modelIds.length === 0
    ? IMAGE_MODELS
    : IMAGE_MODELS.filter((card) => modelIds.includes(card.id));

export const runImageGeneration = async (
  options: ImageGenerationRunOptions,
): Promise<ImageGenerationResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const judge = judgeFor(options.fixture);
  const runs: ImageGenModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const client = generationClientFor(card, options.fixture);
      const calls: ImageGenCallRecord[] = [];
      for (let repetition = 0; repetition < trials; repetition += 1) {
        for (const prompt of PROMPT_MANIFEST.prompts) {
          calls.push(await runPromptOnce(client, judge, prompt, repetition));
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
    judgeModel: options.fixture ? "fixture-judge" : JUDGE_MODEL_ID,
    manifestVersion: PROMPT_MANIFEST.version,
    runs,
    nonSubjects: NON_SUBJECT_PROVIDERS,
    artifactPath: "image-generation-comparison.data.json",
  };
};

export const estimateImageGeneration = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const prompts = PROMPT_MANIFEST.prompts.length;
  const judgePerImage =
    (JUDGE_INPUT_TOKENS_PER_IMAGE * JUDGE_INPUT_USD_PER_MTOK +
      JUDGE_OUTPUT_TOKENS_PER_IMAGE * JUDGE_OUTPUT_USD_PER_MTOK) /
    1_000_000;
  const lines = selectedCards(modelIds).map((card) => {
    const images = prompts * trialCount;
    const cost = images * (card.pricePerImageUsd + judgePerImage);
    return `  ${card.id}: ~$${cost.toFixed(2)} for ${images} image(s) (${prompts} prompt(s) × ${trialCount} repetition(s)) + judge reads`;
  });
  const total = selectedCards(modelIds).reduce(
    (sum, card) =>
      sum + prompts * trialCount * (card.pricePerImageUsd + judgePerImage),
    0,
  );
  return [
    "image-generation estimate (real run; judge token count is an approximation):",
    ...lines,
    `  total: ~$${total.toFixed(2)} (agreed ceiling: $20/trial — stop for re-approval above it)`,
    "No persistent provider resources are created; generated images are judged in memory and discarded.",
  ].join("\n");
};
