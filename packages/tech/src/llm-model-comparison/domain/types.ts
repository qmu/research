// Pure domain types for the fundamental LLM model comparison. No vendor or
// entrypoint types appear here — this module depends on nothing external.
//
// The comparison scores eight aspects. The first five are CURATED reference data
// (a cited in-code registry); the last three are MEASURED live against the real
// provider APIs, now over MULTIPLE TRIALS so each measured aspect is a
// distribution (mean + spread), not a single sample. The curated/measured split
// is the spine of this topic: the type system keeps the two epistemic categories
// from contaminating each other, and every trial's exact prompt and raw output is
// captured verbatim so the report can be fully transparent.

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
  tier: "flagship" | "mid" | "small"; // curated capability/price tier
  modelName: string; // official product name, e.g. "Claude Opus 4.8"
  apiModelId: string; // exact wire id, e.g. "claude-opus-4-8"
  released: string; // ISO date or YYYY-MM, curated
  inputCostPerMTok: number; // USD per 1M input tokens
  outputCostPerMTok: number; // USD per 1M output tokens
  effortLevels: ReadonlyArray<string>; // curated metadata, not a measured sweep
  source: string; // citation URL — provenance is part of the type
}>;

// One API call made during a trial, captured verbatim. The exact `prompt` sent
// and the `rawOutput` received are the transparency substrate the report surfaces
// (and the JSON run-artifact preserves in full).
export type CallRecord = Readonly<{
  probe: "nested-json" | "length"; // which probe issued this call
  prompt: string; // exact prompt sent, verbatim
  rawOutput: string; // exact model output, verbatim
  outputTokens: number;
  elapsedMs: number;
}>;

// The three measured metrics derived from a single trial's calls.
export type TrialMetrics = Readonly<{
  tokensPerSecond: number; // output tokens / wall-clock over the trial's calls
  maxNestedJsonDepth: number; // deepest correctly-nested depth on the ladder
  lengthAccuracy: number; // 0..1
}>;

// One trial: a full probe pass (the nested-JSON ladder plus the length probe) for
// one model. `ok` is false when any call in the trial threw — a failed trial is
// recorded (with its `error`) and excluded from the aggregates, never fatal to the
// run. Every call it made is kept under `calls` for transparency.
export type TrialResult = Readonly<{
  trial: number; // 1-based index
  ok: boolean;
  error: string | null; // present (non-null) iff !ok
  metrics: TrialMetrics; // zeros when !ok
  calls: ReadonlyArray<CallRecord>;
}>;

// A metric reduced over the successful trials: mean and spread. `n` is the count
// of contributing (ok) trials, so a reader can tell a 5-trial mean from a 1-trial
// one at a glance.
export type Aggregate = Readonly<{
  mean: number;
  stdDev: number; // sample std dev (n-1); 0 when n < 2
  min: number;
  max: number;
  n: number;
}>;

// The three aggregated metrics for one model across its trials.
export type ProbeStats = Readonly<{
  tokensPerSecond: Aggregate;
  maxNestedJsonDepth: Aggregate;
  lengthAccuracy: Aggregate;
}>;

// How a model's measured columns were produced. `measured` = live API over ≥1
// successful trial; `fixtured` = deterministic stand-in (no key / --fixture);
// `error` = a live model whose every trial failed. The report never presents a
// non-`measured` row as a live figure.
export type Provenance = "measured" | "fixtured" | "error";

// The join: a curated card plus its measured trials and their aggregates.
export type ModelRun = ModelCard &
  Readonly<{
    provenance: Provenance;
    trialsRequested: number;
    trials: ReadonlyArray<TrialResult>; // all trials, including failed
    stats: ProbeStats; // aggregates over the ok trials
  }>;

// Probe parameters the runner owns and echoes here for the Method section. The
// domain does not decide the depth ladder or the length target — that is
// orchestration policy, kept out of the pure graders.
export type ProbeParams = Readonly<{
  depthLadder: ReadonlyArray<number>;
  lengthTargetWords: number;
  lengthTopic: string;
}>;

// The whole comparison. `artifactPath` is the relative link to the committed JSON
// run-artifact (the full per-trial raw capture); the renderer points readers at
// it. `trials` is the configured trial count N.
export type ComparisonResult = Readonly<{
  runs: ReadonlyArray<ModelRun>;
  trials: number;
  generatedAt: string;
  probe: ProbeParams;
  artifactPath: string;
}>;
