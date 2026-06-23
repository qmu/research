// Pure domain types for the fundamental LLM model comparison. No vendor or
// entrypoint types appear here — this module depends on nothing external.
//
// The comparison scores eight aspects. The first five are CURATED reference data
// (a cited in-code registry); the last three are MEASURED live against the real
// provider APIs. The curated/measured split is the spine of this topic: the type
// system keeps the two epistemic categories from contaminating each other.

// Closed union of the providers compared. Widening this is a deliberate decision,
// not an accident — the domain names a provider only as a tag, never importing an
// SDK type.
export type Provider = "anthropic" | "openai" | "google";

// The CURATED half: static, cited, human-authored catalog data. Every field is a
// column of the comparison table except `apiModelId` (the wire id, isolated here
// so corrections are a one-line edit) and `source` (the citation, so provenance
// is part of the type and an uncited card cannot be constructed clean).
export type ModelCard = Readonly<{
  id: string; // stable slug, used for anchors/keys
  provider: Provider;
  modelName: string; // official product name, e.g. "Claude Opus 4.8"
  apiModelId: string; // exact wire id, e.g. "claude-opus-4-8"
  released: string; // ISO date or YYYY-MM, curated
  inputCostPerMTok: number; // USD per 1M input tokens
  outputCostPerMTok: number; // USD per 1M output tokens
  effortLevels: ReadonlyArray<string>; // curated metadata, not a measured sweep
  source: string; // citation URL — provenance is part of the type
}>;

// The MEASURED half: live or fixtured observation. `measured` is the honesty flag
// — a Measurement literal cannot be constructed without stating its provenance, so
// the report can never silently present a fixtured row as a live measurement.
export type Measurement = Readonly<{
  measured: boolean; // true = live API; false = fixtured stand-in
  tokensPerSecond: number;
  maxNestedJsonDepth: number; // deepest correctly-nested depth achieved
  lengthAccuracy: number; // 0..1
  elapsedMs: number; // raw, kept for transparency/reproduction
  outputTokens: number; // raw, kept for transparency/reproduction
}>;

// The join: a curated card plus its measurement. The only type the report
// consumes, and the only place the two halves meet.
export type ComparisonRow = ModelCard & Readonly<{ measurement: Measurement }>;

// Probe parameters the runner owns and echoes here for the Method section. The
// domain does not decide the depth ladder or the length target — that is
// orchestration policy, kept out of the pure graders.
export type ProbeParams = Readonly<{
  depthLadder: ReadonlyArray<number>;
  lengthTargetWords: number;
  lengthTopic: string;
}>;

export type ComparisonResult = Readonly<{
  rows: ReadonlyArray<ComparisonRow>;
  generatedAt: string;
  probe: ProbeParams;
}>;
