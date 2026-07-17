import type { FamilyCard, SampleClass } from "./domain/types";

/**
 * The curated subject registry: one representative model per provider family.
 * `instrumentVersion` 1 = manifest tm-v1 samples + the affine counting model
 * (content + fitted wrapper overhead); a change to either is a version bump so
 * history charts never connect differently-measured points.
 */
export const TOKEN_METERING_INSTRUMENT_VERSION = "1";

export const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

/** Fixed wrapper overhead the keyless fixture counter simulates. */
export const FIXTURE_OVERHEAD_TOKENS = 7;

/** Deterministic per-class tokens-per-char rates for the fixture counter —
 * plausible magnitudes (Japanese > code > English per char), clearly synthetic. */
export const FIXTURE_RATES: Readonly<Record<SampleClass, number>> = {
  english: 0.25,
  japanese: 1.0,
  code: 0.32,
};

export const FAMILY_CARDS: ReadonlyArray<FamilyCard> = [
  {
    id: "anthropic-claude",
    familyName: "Anthropic Claude",
    apiModelId: "claude-sonnet-5",
    countingMethod: "calibrated-estimator",
    groundTruth: "count-tokens-endpoint",
    inputCostPerMTok: 0, // the count_tokens endpoint is not billed
    vocabularyNote:
      "Tokenizer unpublished for current models (the archived @anthropic-ai/tokenizer covers legacy Claude 2 only), so no exact self-count exists; the self-count is a calibrated estimator against the unbilled count_tokens endpoint.",
    source:
      "https://platform.claude.com/docs/en/build-with-claude/token-counting",
    lastVerified: "2026-07-17",
  },
  {
    id: "openai-gpt",
    familyName: "OpenAI GPT",
    apiModelId: "gpt-5.5",
    countingMethod: "exact-bpe",
    groundTruth: "usage-field-probe",
    inputCostPerMTok: 5,
    vocabularyNote:
      "OpenAI publishes its encodings' vocabulary as ranked byte sequences (o200k_base, ~200k entries) plus the pre-tokenization pattern; there is no count-tokens endpoint, so the ground truth is usage.prompt_tokens from a minimal billed completion.",
    source: "https://developers.openai.com/api/docs/pricing",
    lastVerified: "2026-07-17",
  },
  {
    id: "google-gemini",
    familyName: "Google Gemini",
    apiModelId: "gemini-3.1-pro-preview",
    countingMethod: "calibrated-estimator",
    groundTruth: "count-tokens-endpoint",
    inputCostPerMTok: 0, // the countTokens endpoint is not billed
    vocabularyNote:
      "SentencePiece lineage; Google publishes the Gemma tokenizer model but not the current Gemini API tokenizer, so the self-count is a calibrated estimator against the unbilled countTokens endpoint.",
    source: "https://ai.google.dev/gemini-api/docs/tokens",
    lastVerified: "2026-07-17",
  },
  {
    id: "oss-qwen",
    familyName: "OSS / local (Qwen2.5)",
    apiModelId: "@cf/qwen/qwen2.5-coder-32b-instruct",
    countingMethod: "exact-bpe",
    groundTruth: "usage-field-probe",
    inputCostPerMTok: 0.66,
    vocabularyNote:
      "Open-weight models ship tokenizer.json (vocabulary + ordered merge list + pre-tokenizer pattern, Apache-2.0 for Qwen2.5), so an exact self-count exists; the ground truth is usage.prompt_tokens reported by a hosted serving stack (Cloudflare Workers AI).",
    source: "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct",
    lastVerified: "2026-07-17",
  },
];

/** Published vocabulary sources for the exact families (fetched on a real run,
 * cached under packages/tech/.cache/, never committed). */
export const VOCABULARY_SOURCES: Readonly<Record<string, string>> = {
  "openai-gpt":
    "https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken",
  "oss-qwen":
    "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct/resolve/main/tokenizer.json",
};

/** Output price for the one family whose ground-truth probe bills a completion
 * (a few clamped output tokens per call). */
export const OPENAI_OUTPUT_COST_PER_MTOK = 30;

/** Probe image size for the multimodal edge case: 300×300 keeps both published
 * formulas in their small-image regime (Anthropic w×h/750 = 120; Gemini flat
 * 258 below the 384px tiling threshold). */
export const PROBE_IMAGE_SIZE = 300;
