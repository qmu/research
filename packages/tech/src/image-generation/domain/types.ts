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

/**
 * The practical use-case a prompt exercises. `mechanical` is the manifest-v1
 * shape family (abstract shapes / exact-text probes) kept so history stays
 * comparable; the other five are the manifest-v2 practical categories whose
 * generated images become the qualitative exhibit on the published pages. Each
 * category still carries machine-checkable rubric constraints, so scoring stays
 * objective — the categories add realistic subjects, not opinion scoring.
 */
export type ImagePromptCategory =
  | "mechanical"
  | "presentation-slide"
  | "photo"
  | "character"
  | "infographic"
  | "meeting-document";

/** The five practical categories introduced in manifest v2 (order = display
 * order on the published pages). `mechanical` is intentionally excluded. */
export const PRACTICAL_IMAGE_CATEGORIES: ReadonlyArray<ImagePromptCategory> = [
  "presentation-slide",
  "photo",
  "character",
  "infographic",
  "meeting-document",
];

export type ImagePrompt = Readonly<{
  id: string;
  kind: ImagePromptKind;
  /** The practical use-case this prompt exercises (v2). */
  category: ImagePromptCategory;
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

/** One generation + judgement, recorded in full. The artifact keeps byte
 * length, sha256, and scores; on a real run a practical-category image is also
 * persisted next to the frame and its relative path recorded (`imagePath`), so
 * the page can embed the actual picture. The image bytes themselves are never
 * inlined into the JSON — the artifact stays a text record that points at the
 * committed image file. */
export type ImageGenCallRecord = Readonly<{
  promptId: string;
  category: ImagePromptCategory;
  kind: ImagePromptKind;
  repetition: number;
  latencyMs: number;
  imageByteLength: number;
  imageMimeType: string;
  /** Frame-relative path to the persisted image (real runs, practical
   * categories only), e.g. `images/grok-imagine-image--photo-red-apple--r0.png`.
   * Absent on the keyless fixture path and for `mechanical` prompts. */
  imagePath?: string;
  /** SHA-256 of the generated image bytes (hex). Recorded whenever the image is
   * persisted, so a committed frame image can be integrity-checked without the
   * original run. */
  imageSha256?: string;
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
