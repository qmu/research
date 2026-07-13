import type {
  Completion,
  JsonSchema,
  StructuredCompletion,
  VisionClient,
  VisionInput,
} from "../vendors/llm/types";
import {
  characterErrorRate,
  scoreStructuredFields,
  summarizeStats,
  wordErrorRate,
} from "./domain/ocr";
import { loadOcrDataset } from "./domain/dataset";
import { renderOcrDocument } from "./domain/synthetic-image";
import type {
  DocumentOcrScore,
  OcrCallRecord,
  OcrComparisonResult,
  OcrDataset,
  OcrDocument,
  OcrModelRun,
  Provenance,
} from "./domain/types";
import { MODELS } from "../llm-model-comparison/models";
import type { ModelCard } from "../llm-model-comparison/domain/types";
import {
  ANTHROPIC_VISION_CAPABILITY,
  createAnthropicVisionClient,
} from "../vendors/llm/anthropic";

export type OcrRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
}>;

type OcrCandidate = Readonly<{
  card: ModelCard;
  status: "in-scope" | "out-of-scope";
  reason: string;
}>;

const TRANSCRIPTION_INSTRUCTION =
  "Transcribe the document image exactly. Preserve line order. Return only the transcription text.";

const STRUCTURED_INSTRUCTION =
  "Extract the required fields from the document image. Return only JSON matching the schema.";

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const ESTIMATE_IMAGE_INPUT_TOKENS = 1_800;
const ESTIMATE_TEXT_OUTPUT_TOKENS = 220;
const ESTIMATE_STRUCTURED_OUTPUT_TOKENS = 90;

const isAnthropicVisionCandidate = (card: ModelCard): boolean =>
  card.provider === "anthropic" && card.api === undefined;

const candidates = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<OcrCandidate> => {
  const selected =
    modelIds === undefined || modelIds.length === 0
      ? MODELS
      : MODELS.filter((model) => modelIds.includes(model.id));
  return selected.map((card) =>
    isAnthropicVisionCandidate(card)
      ? {
          card,
          status: "in-scope",
          reason: "Anthropic vision ACL is available for this model card.",
        }
      : {
          card,
          status: "out-of-scope",
          reason:
            "No VisionClient adapter is registered for this provider/API surface.",
        },
  );
};

const parseJsonObject = (raw: string): Readonly<Record<string, unknown>> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const buildTranscriptionInput = (
  dataset: OcrDataset,
  document: OcrDocument,
): VisionInput => ({
  instruction: [
    TRANSCRIPTION_INSTRUCTION,
    `Dataset: ${dataset.dataset.id}.`,
    `Document id: ${document.id}.`,
  ].join("\n"),
  images: [renderOcrDocument(dataset, document).image],
});

const buildStructuredInput = (
  dataset: OcrDataset,
  document: OcrDocument,
): VisionInput => ({
  instruction: [
    STRUCTURED_INSTRUCTION,
    `Dataset: ${dataset.dataset.id}.`,
    `Document id: ${document.id}.`,
    `Fields: ${dataset.schema.fields.map((field) => field.name).join(", ")}.`,
  ].join("\n"),
  images: [renderOcrDocument(dataset, document).image],
});

const scoreDocument = (
  dataset: OcrDataset,
  document: OcrDocument,
  transcription: string,
  structuredRaw: string,
): DocumentOcrScore => {
  const fieldScore = scoreStructuredFields(
    document.fields,
    parseJsonObject(structuredRaw),
    dataset.schema.fields,
  );
  return {
    documentId: document.id,
    characterErrorRate: characterErrorRate(
      document.referenceText,
      transcription,
    ),
    wordErrorRate: wordErrorRate(document.referenceText, transcription),
    fieldAccuracy: fieldScore.accuracy,
    fieldScore,
  };
};

const runDocument = async (
  client: VisionClient,
  dataset: OcrDataset,
  document: OcrDocument,
  schema: JsonSchema,
): Promise<Readonly<{ score: DocumentOcrScore; call: OcrCallRecord }>> => {
  const transcriptionInput = buildTranscriptionInput(dataset, document);
  const structuredInput = buildStructuredInput(dataset, document);
  const transcription = await client.completeVision(transcriptionInput, {
    maxTokens: 1024,
  });
  const structured = await client.completeVisionStructured(
    structuredInput,
    schema,
    { maxTokens: 512 },
  );
  return {
    score: scoreDocument(dataset, document, transcription.text, structured.raw),
    call: {
      documentId: document.id,
      transcriptionPrompt: transcriptionInput.instruction,
      structuredPrompt: structuredInput.instruction,
      rawTranscription: transcription.text,
      rawStructured: structured.raw,
      outputTokens: transcription.outputTokens + structured.outputTokens,
      elapsedMs: transcription.elapsedMs + structured.elapsedMs,
      error: undefined,
    },
  };
};

const zeroStats = {
  characterErrorRate: { mean: 0, stdDev: 0, n: 0 },
  wordErrorRate: { mean: 0, stdDev: 0, n: 0 },
  fieldAccuracy: { mean: 0, stdDev: 0, n: 0 },
} as const;

const outOfScopeRun = (
  candidate: OcrCandidate,
  measuredAt: string,
  trials: number,
): OcrModelRun => ({
  id: candidate.card.id,
  modelName: candidate.card.modelName,
  provider: candidate.card.provider,
  apiModelId: candidate.card.apiModelId,
  provenance: "out-of-scope",
  measuredAt,
  trialsRequested: trials,
  stats: zeroStats,
  documentScores: [],
  calls: [],
  source: candidate.card.source,
  error: candidate.reason,
});

const errorRun = (
  candidate: OcrCandidate,
  measuredAt: string,
  trials: number,
  error: string,
): OcrModelRun => ({
  id: candidate.card.id,
  modelName: candidate.card.modelName,
  provider: candidate.card.provider,
  apiModelId: candidate.card.apiModelId,
  provenance: "error",
  measuredAt,
  trialsRequested: trials,
  stats: zeroStats,
  documentScores: [],
  calls: [],
  source: candidate.card.source,
  error,
});

const aggregateRun = (
  candidate: OcrCandidate,
  provenance: Provenance,
  measuredAt: string,
  trials: number,
  scores: ReadonlyArray<DocumentOcrScore>,
  calls: ReadonlyArray<OcrCallRecord>,
): OcrModelRun => ({
  id: candidate.card.id,
  modelName: candidate.card.modelName,
  provider: candidate.card.provider,
  apiModelId: candidate.card.apiModelId,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    characterErrorRate: summarizeStats(
      scores.map((score) => score.characterErrorRate),
    ),
    wordErrorRate: summarizeStats(scores.map((score) => score.wordErrorRate)),
    fieldAccuracy: summarizeStats(scores.map((score) => score.fieldAccuracy)),
  },
  documentScores: scores,
  calls,
  source: candidate.card.source,
});

const clientFor = (
  candidate: OcrCandidate,
  fixture: boolean,
  dataset: OcrDataset,
): VisionClient => {
  if (fixture) {
    return createFixtureOcrVisionClient(candidate.card.apiModelId, dataset);
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required for real OCR vision runs.");
  }
  return createAnthropicVisionClient(
    candidate.card.apiModelId,
    key,
    ANTHROPIC_VISION_CAPABILITY,
  );
};

const runCandidate = async (
  candidate: OcrCandidate,
  dataset: OcrDataset,
  fixture: boolean,
  measuredAt: string,
  trials: number,
): Promise<OcrModelRun> => {
  if (candidate.status === "out-of-scope") {
    return outOfScopeRun(candidate, measuredAt, trials);
  }
  try {
    const client = clientFor(candidate, fixture, dataset);
    const scores: DocumentOcrScore[] = [];
    const calls: OcrCallRecord[] = [];
    for (let trial = 0; trial < trials; trial += 1) {
      for (const document of dataset.documents) {
        const result = await runDocument(
          client,
          dataset,
          document,
          dataset.structuredSchema,
        );
        scores.push(result.score);
        calls.push(result.call);
      }
    }
    return aggregateRun(
      candidate,
      fixture ? "fixtured" : "measured",
      measuredAt,
      trials,
      scores,
      calls,
    );
  } catch (error) {
    return errorRun(candidate, measuredAt, trials, String(error));
  }
};

export const runOcrComparison = async (
  options: OcrRunOptions,
): Promise<OcrComparisonResult> => {
  const dataset = loadOcrDataset();
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const runs: OcrModelRun[] = [];
  for (const candidate of candidates(options.modelIds)) {
    runs.push(
      await runCandidate(
        candidate,
        dataset,
        options.fixture,
        generatedAt,
        trials,
      ),
    );
  }
  return {
    generatedAt,
    fixture: options.fixture,
    trials,
    dataset,
    runs,
    artifactPath: "ocr-comparison.data.json",
  };
};

export const estimateOcrComparison = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const dataset = loadOcrDataset();
  const trialCount = Math.max(1, Math.trunc(trials));
  const lines = candidates(modelIds)
    .filter((candidate) => candidate.status === "in-scope")
    .map((candidate) => {
      const calls = dataset.documents.length * trialCount;
      const inputMTok = (calls * 2 * ESTIMATE_IMAGE_INPUT_TOKENS) / 1_000_000;
      const outputMTok =
        (calls *
          (ESTIMATE_TEXT_OUTPUT_TOKENS + ESTIMATE_STRUCTURED_OUTPUT_TOKENS)) /
        1_000_000;
      const cost =
        inputMTok * candidate.card.inputCostPerMTok +
        outputMTok * candidate.card.outputCostPerMTok;
      return `  ${candidate.card.id}: ~$${cost.toFixed(4)} for ${trialCount} trial(s) × ${dataset.documents.length} document(s) × 2 vision call(s)`;
    });
  return [
    "ocr-comparison estimate (real run; image-token count is an approximation):",
    ...lines,
    "No persistent provider resources are created; rendered synthetic images are discarded after each request.",
  ].join("\n");
};

const fixtureDocumentFor = (
  input: VisionInput,
  dataset: OcrDataset,
): OcrDocument | undefined => {
  const label = input.images[0]?.label;
  return dataset.documents.find((document) => document.id === label);
};

export const createFixtureOcrVisionClient = (
  model: string,
  dataset: OcrDataset,
): VisionClient => ({
  model,
  capability: ANTHROPIC_VISION_CAPABILITY,
  completeVision: (input: VisionInput): Promise<Completion> => {
    const document = fixtureDocumentFor(input, dataset);
    const text = document?.referenceText ?? "";
    return Promise.resolve({
      text,
      outputTokens: Math.max(1, Math.ceil(text.length / 4)),
      elapsedMs: 7,
      model,
    });
  },
  completeVisionStructured: (
    input: VisionInput,
    _schema: JsonSchema,
  ): Promise<StructuredCompletion> => {
    const document = fixtureDocumentFor(input, dataset);
    const raw = JSON.stringify(document?.fields ?? {});
    return Promise.resolve({
      raw,
      outputTokens: Math.max(1, Math.ceil(raw.length / 4)),
      elapsedMs: 5,
      model,
    });
  },
});
