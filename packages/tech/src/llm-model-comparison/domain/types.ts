import type { EffortLevel } from "./effort";

// Pure domain types for the fundamental LLM model comparison. No vendor or
// entrypoint types appear here — this module depends on nothing external.
//
// The comparison scores each model over a MATRIX of configurations. A
// configuration is a (model × effort level) pair: the same model at "low" and at
// "high" reasoning effort is two configurations, measured independently. For each
// configuration the runner measures four behaviors live, over MULTIPLE TRIALS, so
// each metric is a distribution (mean + spread), and an LLM judge reads the actual
// trial outputs and writes a developer-facing review.
//
// Curated catalog facts (provider, model, tier, released, cost, effort levels)
// stay separated from measured behavior by the type system, and every call's
// exact prompt and raw output is captured verbatim so the JSON run-artifact is a
// complete record from which a report can be regenerated at any detail level.

// Closed union of the providers compared. Widening this is a deliberate decision,
// not an accident — the domain names a provider only as a tag, never importing an
// SDK type. `xai` is an OpenAI-compatible endpoint reached through a base-URL
// variant of the OpenAI adapter (the Grok lineup — general + coding models).
export type Provider = "anthropic" | "openai" | "google" | "xai";

// The CURATED half: static, cited, human-authored catalog data. Every field is a
// column of the comparison table except `apiModelId` (the wire id, isolated here
// so corrections are a one-line edit) and `source` (the citation, so provenance
// is part of the type and an uncited card cannot be constructed clean).
export type ModelCard = Readonly<{
  id: string; // stable slug, used for anchors/keys
  provider: Provider;
  tier: "frontier" | "flagship" | "mid" | "small"; // curated capability/price tier
  // Which API surface the model is reached through. "chat" is the default
  // text-completions endpoint; "realtime" is the bidirectional WebSocket Realtime
  // API, driven text-only; "responses" is OpenAI's Responses API (`/v1/responses`),
  // the surface the reasoning/`-codex` models are reached through. All sit behind
  // the same CompletionClient port.
  api?: "chat" | "realtime" | "responses";
  modelName: string; // official product name, e.g. "Claude Opus 4.8"
  apiModelId: string; // exact wire id, e.g. "claude-opus-4-8"
  released: string; // ISO date or YYYY-MM, curated
  inputCostPerMTok: number; // USD per 1M input tokens
  outputCostPerMTok: number; // USD per 1M output tokens
  effortLevels: ReadonlyArray<EffortLevel>; // the effort levels swept — a configuration axis
  source: string; // citation URL — provenance is part of the type
}>;

// Which probe a captured call belongs to. Each probe exercises a distinct,
// separately-reported behavior.
export type Probe = "throughput" | "latency" | "schema" | "length";

// One API call made during a trial, captured verbatim. This is the transparency
// substrate the report surfaces and the JSON run-artifact preserves in full — it
// carries every field any probe needs so no information is lost:
//
//  - `ttftMs` is the streamed time-to-first-token (throughput/latency calls) or
//    null for non-streamed calls.
//  - `schemaAxis` / `schemaValue` / `schemaConforms` describe a structured-output
//    call: which axis was being escalated (nesting depth or field breadth), the
//    value attempted, and whether the returned JSON conformed.
//  - `error` records a call the provider rejected or that failed (e.g. "schema
//    too complex", a 400, a timeout) — for schema calls this is a FINDING (the
//    ceiling), preserved verbatim so a reader can distinguish a structural limit
//    from a transient network failure.
export type CallRecord = Readonly<{
  probe: Probe;
  effort: EffortLevel; // the configuration's effort level
  prompt: string; // exact prompt sent, verbatim
  rawOutput: string; // exact model output, verbatim
  outputTokens: number;
  elapsedMs: number; // total wall-clock for the call
  ttftMs: number | null; // time-to-first-token when streamed, else null
  schemaAxis: "depth" | "breadth" | null; // schema calls: the escalated axis
  schemaValue: number | null; // schema calls: the depth/breadth attempted
  schemaConforms: boolean | null; // schema calls: did the output conform
  error: string | null; // the failure/rejection, verbatim, when the call failed
}>;

// The metrics derived from a single trial's calls. Throughput and latency are
// separate (throughput is sustained generation speed; latency is TTFT + total
// response time), and the JSON metrics are the tested maxima along the two
// independent schema axes: the deepest nesting and the widest field count for
// which the model still returned schema-conforming structured output.
export type TrialMetrics = Readonly<{
  throughputTokensPerSec: number; // sustained tokens/sec during generation
  ttftMs: number; // time-to-first-token on the latency probe
  totalLatencyMs: number; // total response time on the latency probe
  maxSchemaDepth: number; // deepest conforming nesting (breadth 1)
  maxSchemaBreadth: number; // widest conforming field count (depth 1)
  lengthAccuracy: number; // 0..1
}>;

// One trial: a full probe pass (throughput, latency, schema escalation, length)
// for one configuration. `ok` is false when any call in the trial threw — a
// failed trial is recorded (with its `error`) and excluded from the aggregates,
// never fatal to the run. Every call it made is kept under `calls` for
// transparency.
export type TrialResult = Readonly<{
  trial: number; // 1-based index
  ok: boolean;
  error: string | null; // present (non-null) iff !ok
  metrics: TrialMetrics; // zeros when !ok
  calls: ReadonlyArray<CallRecord>;
}>;

// A metric reduced over the successful trials: mean and spread. `n` is the count
// of contributing (ok) trials, so a reader can tell a 3-trial mean from a 1-trial
// one at a glance.
export type Aggregate = Readonly<{
  mean: number;
  stdDev: number; // sample std dev (n-1); 0 when n < 2
  min: number;
  max: number;
  n: number;
}>;

// The aggregated metrics for one configuration across its trials.
export type ProbeStats = Readonly<{
  throughputTokensPerSec: Aggregate;
  ttftMs: Aggregate;
  totalLatencyMs: Aggregate;
  maxSchemaDepth: Aggregate;
  maxSchemaBreadth: Aggregate;
  lengthAccuracy: Aggregate;
}>;

// How a configuration's measured columns were produced. `measured` = live API
// over ≥1 successful trial; `fixtured` = deterministic stand-in (no key /
// --fixture); `error` = a live configuration whose every trial failed. The report
// never presents a non-`measured` row as a live figure.
export type Provenance = "measured" | "fixtured" | "error";

// A developer-facing review of one configuration, written by an LLM judge that
// read the configuration's actual trial outputs and metrics. `provenance`
// distinguishes a live judge (`judged`), the deterministic fixture judge
// (`fixtured`), and a configuration for which no review was produced (`skipped`).
export type Review = Readonly<{
  provenance: "judged" | "fixtured" | "skipped";
  judgeModel: string; // the judge model id (curated fact for real runs)
  strengths: string;
  weaknesses: string;
  bestFor: string; // what workloads this model+config suits
  raw: string; // the judge's raw response, preserved for the artifact
}>;

// The join: a curated card + a specific effort level (the configuration), its
// measured trials and their aggregates, and its judge review. `measuredAt` is the
// ISO timestamp of the run that produced THIS cell — a merged artifact holds cells
// from several runs, so the per-config stamp (not the artifact's single
// `generatedAt`) says when each number was actually measured.
export type ConfigRun = ModelCard &
  Readonly<{
    effort: EffortLevel; // the effort level this run measured
    provenance: Provenance;
    measuredAt: string; // ISO timestamp of the run that measured this cell
    trialsRequested: number;
    trials: ReadonlyArray<TrialResult>; // all trials, including failed
    stats: ProbeStats; // aggregates over the ok trials
    review: Review; // per-configuration developer review
  }>;

// --- historical benchmark series --------------------------------------------
//
// A recurring sweep keeps a time series, not a single snapshot. The latest full
// `.data.json` stays the complete record (every call's raw capture); the history
// is a COMPACT per-config projection — just the metric means + provenance +
// measured-at — small and diff-friendly so trends render from git without
// decompressing every archived run. Each history entry links back (by timestamp)
// to a gzipped full-record archive, so nothing is lost.

// One configuration's compact metric point in a recorded run.
export type HistoryPoint = Readonly<{
  id: string; // config slug (ModelCard.id)
  provider: Provider;
  modelName: string;
  effort: EffortLevel;
  provenance: Provenance;
  throughputTokensPerSec: number; // mean over the run's ok trials
  ttftMs: number;
  totalLatencyMs: number;
  maxSchemaDepth: number;
  maxSchemaBreadth: number;
  lengthAccuracy: number; // 0..1
  measuredAt: string; // when this cell was measured
}>;

// One recorded run: its wall-clock stamp, trial count, and every config's point.
export type HistoryEntry = Readonly<{
  generatedAt: string;
  trials: number;
  points: ReadonlyArray<HistoryPoint>;
}>;

// The append-only history file — one entry per recorded run, newest appended last.
export type HistoryFile = Readonly<{
  entries: ReadonlyArray<HistoryEntry>;
}>;

// One shape for the schema generator: an object nested `depth` levels, each
// level carrying `breadth` scalar fields.
export type SchemaComplexity = Readonly<{
  depth: number; // object nesting levels (>= 1)
  breadth: number; // scalar fields per level (>= 0)
}>;

// One escalation axis: geometric climb from `start` (doubling per probe) up to a
// hard probe ceiling `cap`, then bounded bisection to pin the tested maximum. A
// fixed short ladder measures its own ceiling, not the model's — this finds the
// real one, bounded only by `cap`.
export type SchemaAxisParams = Readonly<{
  start: number; // first probed value
  cap: number; // hard probe ceiling (a conforming cap reads as ">= cap")
}>;

// The adaptive schema probe: the two independent axes (nesting depth at breadth
// 1; field breadth at depth 1), the bisection budget after the failure bracket,
// and the output-token budget schema calls run under (wide schemas need room).
export type SchemaProbeParams = Readonly<{
  depth: SchemaAxisParams;
  breadth: SchemaAxisParams;
  refineSteps: number; // max bisection probes per axis after the bracket
  maxTokens: number; // output budget for structured-output calls
}>;

// Probe parameters the runner owns and echoes here for the Method section. The
// domain does not decide these — they are orchestration policy, kept out of the
// pure graders.
export type ProbeParams = Readonly<{
  throughputTargetWords: number; // long-generation target for the throughput probe
  throughputTopic: string;
  latencyPrompt: string; // short prompt whose TTFT + total is the latency probe
  schemaProbe: SchemaProbeParams; // adaptive per-axis escalation
  lengthTargetWords: number;
  lengthTopic: string;
}>;

// A pre-run estimate of the cost of a real sweep: how many configurations, how
// many API calls, a rough USD cost from the registry prices, and an ETA. Printed
// before any real run (and by the `--estimate` dry-run) so the owner sees the
// bill before it is incurred.
export type RunEstimate = Readonly<{
  configCount: number;
  callCount: number;
  usdCost: number;
  etaMinutes: number;
}>;

// The whole comparison. `configs` is the full model × effort matrix; `judgeModel`
// records which model reviewed the configurations (a curated fact); `estimate` is
// the pre-run cost estimate; `artifactPath` is the relative link to the committed
// JSON run-artifact (the complete per-call raw capture from which the report is
// rendered). `trials` is the configured trial count N.
export type ComparisonResult = Readonly<{
  configs: ReadonlyArray<ConfigRun>;
  trials: number;
  generatedAt: string;
  probe: ProbeParams;
  judgeModel: string;
  estimate: RunEstimate;
  artifactPath: string;
}>;
