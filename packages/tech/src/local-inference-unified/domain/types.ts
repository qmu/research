// Shared vocabulary for the unified local-inference view: the fixed engine
// set, metric names grouped by dimension (speed, quality, memory), the gap
// and failure codes a producer may report, and the parsed record shape.
// Keeping these as a single source avoids each dimension inventing its own
// spelling of "missing" or "failed".

export const ENGINES = ["ollama", "llama.cpp", "mlx", "strata"] as const;
export type Engine = (typeof ENGINES)[number];

export const ENGINE_LABELS: Readonly<Record<Engine, string>> = {
  ollama: "Ollama",
  "llama.cpp": "llama.cpp",
  mlx: "MLX",
  strata: "Strata",
};

// Per-metric reasons a value is missing. Independent of the run's overall
// failure code: a measured run can still carry an unsupported metric.
export const GAP_REASONS = [
  "NO-FIELD",
  "NOT-RUN",
  "MEASURE-FAILED",
  "UNSUPPORTED",
] as const;
export type GapReason = (typeof GAP_REASONS)[number];

export const GAP_LABELS: Readonly<Record<GapReason, string>> = {
  UNSUPPORTED: "未対応",
  "MEASURE-FAILED": "失敗",
  "NO-FIELD": "記録なし",
  "NOT-RUN": "記録なし",
};

// Why an entire run was not adopted into the comparison.
export const FAILURE_CODES = [
  "TIMEOUT",
  "OUT-OF-MEMORY",
  "MODEL-NOT-FOUND",
  "NOT-LOADABLE",
  "UNSUPPORTED",
  "UNREACHABLE",
  "CANCELLED",
  "MEASURE-FAILED",
] as const;
export type FailureCode = (typeof FAILURE_CODES)[number];

export const DIMENSIONS = ["speed", "quality", "memory"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const METRICS = [
  "ttft",
  "tps",
  "startup_time",
  "quality_score",
  "peak_rss",
] as const;
export type MetricName = (typeof METRICS)[number];

export const METRIC_LABELS: Readonly<Record<MetricName, string>> = {
  ttft: "TTFT",
  tps: "TPS",
  startup_time: "Startup",
  quality_score: "Quality",
  peak_rss: "Peak RSS",
};

export const METRIC_DIMENSION: Readonly<Record<MetricName, Dimension>> = {
  ttft: "speed",
  tps: "speed",
  startup_time: "speed",
  quality_score: "quality",
  peak_rss: "memory",
};

export type Measurement =
  | { value: number; unit: string; source: "client" | "usage" }
  | { value: null; unit: string; reason: GapReason };

export type Run = {
  engine: Engine;
  model: string;
  runtimeVersion: string;
  condition: Readonly<Record<string, string | number | boolean>>;
  status: "measured" | "failed";
  failure?: { code: FailureCode };
  metrics: Readonly<Record<MetricName, Measurement>>;
};

export type UnifiedResult = {
  schemaVersion: 1;
  generatedAt: string;
  inputSha256: string;
  procedure: string;
  runs: ReadonlyArray<Run>;
};

export function metricsForDimension(dimension: Dimension): MetricName[] {
  return METRICS.filter((name) => METRIC_DIMENSION[name] === dimension);
}
