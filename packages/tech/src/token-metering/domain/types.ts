/**
 * Domain vocabulary for the token-metering topic: counting the input tokens an
 * LLM API will bill for, WITHOUT the provider's tokenizer library, and
 * validating the count against the number the provider's API itself reports.
 *
 * Two counting methods exist, and every subject family declares which one it
 * uses (the article's core distinction):
 *
 * - `exact-bpe`: the provider publishes its tokenizer's vocabulary and merge
 *   rules, so a self-implemented byte-pair-encoding counter reproduces the
 *   count exactly (OpenAI's published encodings; OSS models' tokenizer.json).
 * - `calibrated-estimator`: the tokenizer is unpublished (Anthropic Claude,
 *   Google Gemini), so the count is a statistical estimate — per-class
 *   characters-per-token rates fitted against the provider's free
 *   token-counting endpoint — and carries an error band, never false precision.
 */

/** Sample text classes: the three corpora the accuracy target is stated over. */
export type SampleClass = "english" | "japanese" | "code";

export const SAMPLE_CLASSES: ReadonlyArray<SampleClass> = [
  "english",
  "japanese",
  "code",
];

/** Which half of the split a sample belongs to. Calibration rows fit the
 * estimator (rates + wrapper overhead); holdout rows measure its error. */
export type SampleRole = "calibration" | "holdout";

export type TokenSample = Readonly<{
  id: string;
  class: SampleClass;
  role: SampleRole;
  text: string;
}>;

export type CountingMethod = "exact-bpe" | "calibrated-estimator";

/** How the family's ground-truth count is obtained on a real run. */
export type GroundTruthSource =
  | "count-tokens-endpoint" // dedicated, unbilled token-counting API
  | "usage-field-probe"; // a minimal billed completion's usage.prompt_tokens

export type FamilyCard = Readonly<{
  id: string;
  /** Provider family label used in tables (Anthropic Claude, OpenAI, ...). */
  familyName: string;
  /** The concrete model the ground truth is measured against. */
  apiModelId: string;
  countingMethod: CountingMethod;
  groundTruth: GroundTruthSource;
  /** Published input price used to account the probe spend (0 for unbilled
   * count endpoints). From the foundation-models catalog. */
  inputCostPerMTok: number;
  /** Where the self-count's vocabulary comes from, or why none exists. */
  vocabularyNote: string;
  source: string;
  lastVerified: string;
}>;

export type CountProvenance = "measured" | "fixtured" | "unreachable" | "error";

/** One sample × one family: the self-count against the API-reported count. */
export type SampleCountRow = Readonly<{
  sampleId: string;
  class: SampleClass;
  role: SampleRole;
  chars: number;
  utf8Bytes: number;
  /** Self-implemented content-token count (exact families only). */
  selfContentTokens?: number;
  /** The provider-reported token count for the wrapped one-message request. */
  apiTokens?: number;
  /** The self-count's prediction of `apiTokens` (content + fitted wrapper
   * overhead for exact families; rate-based estimate for estimator families). */
  predictedTokens?: number;
  /** 100 × (predicted − api) / api. */
  errorPct?: number;
  provenance: CountProvenance;
  error?: string;
}>;

/** The fitted calibration a family's prediction used. Reused by the plgg
 * library ticket, so it is persisted in the data artifact verbatim. */
export type FamilyCalibration = Readonly<{
  /** Fitted wrapper overhead in tokens (chat-template / message framing). */
  overheadTokens: number;
  /** Per-class tokens-per-character rates (estimator families; exact families
   * carry them too, as the descriptive tokens-per-char statistics). */
  tokensPerChar: Readonly<Record<SampleClass, number>>;
}>;

export type ClassErrorStat = Readonly<{
  class: SampleClass;
  holdoutCount: number;
  meanAbsErrorPct: number;
  maxAbsErrorPct: number;
  /** Signed error band over the holdout rows: [min, max] in percent. */
  errorBandPct: readonly [number, number];
  withinTarget: boolean;
}>;

export type FamilyMeasurement = Readonly<{
  card: FamilyCard;
  provenance: CountProvenance;
  rows: ReadonlyArray<SampleCountRow>;
  calibration?: FamilyCalibration;
  perClass: ReadonlyArray<ClassErrorStat>;
  holdoutMeanAbsErrorPct?: number;
  holdoutMaxAbsErrorPct?: number;
  withinTarget?: boolean;
  /** Probe spend attributed to this family, USD (0 for unbilled endpoints). */
  spendUsd: number;
  error?: string;
}>;

/** Edge-case probes that are measurable at zero or negligible cost. Absent
 * values mean the probe did not run (fixture path) or failed (recorded). */
export type EdgeProbeResults = Readonly<{
  /** Anthropic count_tokens with vs. without one tool definition. */
  anthropicToolOverheadTokens?: number;
  /** Anthropic count_tokens for one small PNG (formula: width×height/750). */
  anthropicImageTokens?: number;
  /** Gemini countTokens for the same PNG (documented flat 258/tile). */
  googleImageTokens?: number;
  /** The probe image's pixel size, for checking the published formulas. */
  imageWidth?: number;
  imageHeight?: number;
  notes?: ReadonlyArray<string>;
}>;

export type TokenMeteringResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  instrumentVersion: number;
  samplesVersion: string;
  /** The agreed accuracy target, percent (±). */
  accuracyTargetPct: number;
  families: ReadonlyArray<FamilyMeasurement>;
  edgeProbes: EdgeProbeResults;
  /** Total measured API spend of the benchmark stage, USD. */
  spendUsd: number;
  artifactPath: string;
}>;
