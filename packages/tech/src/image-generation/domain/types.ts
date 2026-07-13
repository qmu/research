/** Provider tags for image generation. Anthropic is deliberately absent: it
 * exposes no image-generation API and is recorded as a non-subject instead. */
export type ImageGenProvider = "openai" | "google" | "xai";

export type ImageModelCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: ImageGenProvider;
  modelName: string;
  apiModelId: string;
  /** Curated per-image price at `sizeTier` (catalog data, not measured). */
  pricePerImageUsd: number;
  sizeTier: string;
  /** Date the id and price were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

export type NonSubjectProvider = Readonly<{
  providerName: string;
  reason: string;
  lastVerified: string;
}>;

/** One mechanically checkable yes/no constraint the vision judge answers. */
export type PromptConstraint = Readonly<{
  id: string;
  /** The exact yes/no question put to the judge. */
  question: string;
}>;

export type ImagePromptKind = "adherence" | "text";

export type ImagePrompt = Readonly<{
  id: string;
  kind: ImagePromptKind;
  prompt: string;
  /** For `adherence` prompts: the rubric the judge answers. */
  constraints: ReadonlyArray<PromptConstraint>;
  /** For `text` prompts: the exact string the image must render. */
  expectedText?: string;
}>;

export type PromptManifest = Readonly<{
  version: string;
  prompts: ReadonlyArray<ImagePrompt>;
}>;

export type JudgeAnswer = Readonly<{
  constraintId: string;
  satisfied: boolean;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

/** One generation + judgement, recorded in full (minus the image binary — the
 * artifact keeps byte length and scores, never the bytes). */
export type ImageGenCallRecord = Readonly<{
  promptId: string;
  kind: ImagePromptKind;
  repetition: number;
  latencyMs: number;
  imageByteLength: number;
  imageMimeType: string;
  /** Judge rubric answers (adherence prompts). */
  judgeAnswers?: ReadonlyArray<JudgeAnswer>;
  /** Judge transcription of rendered text (text prompts). */
  judgeTranscription?: string;
  promptAdherence?: number;
  textRenderAccuracy?: number;
  error?: string;
}>;

export type Provenance = "measured" | "fixtured" | "error";

export type ImageGenModelRun = Readonly<{
  id: string;
  provider: ImageGenProvider;
  modelName: string;
  apiModelId: string;
  pricePerImageUsd: number;
  sizeTier: string;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    generationLatencyMs: Stat;
    promptAdherence: Stat;
    textRenderAccuracy: Stat;
  }>;
  calls: ReadonlyArray<ImageGenCallRecord>;
  error?: string;
}>;

export type ImageGenerationResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  judgeModel: string;
  manifestVersion: string;
  runs: ReadonlyArray<ImageGenModelRun>;
  nonSubjects: ReadonlyArray<NonSubjectProvider>;
  artifactPath: string;
}>;
