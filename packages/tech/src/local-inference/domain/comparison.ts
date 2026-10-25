// Reads the common inference JSON a local-inference measurement run writes
// and renders a deterministic comparison page for Ollama, llama.cpp, MLX and
// Strata. Every missing metric and every failed run already carries a
// machine-readable code from a fixed set; this module accepts only those
// codes, so an unrecognised one fails parsing instead of rendering as silent
// prose, a blank cell or a misleading zero.

export const ENGINES = ["ollama", "llama.cpp", "mlx", "strata"] as const;
export type Engine = (typeof ENGINES)[number];

const ENGINE_LABELS: Readonly<Record<Engine, string>> = {
  ollama: "Ollama",
  "llama.cpp": "llama.cpp",
  mlx: "MLX",
  strata: "Strata",
};

// Why a single metric is missing even though the run itself succeeded.
export const GAP_REASONS = ["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"] as const;
export type GapReason = (typeof GAP_REASONS)[number];

// Why a run was not adopted into the comparison at all.
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

export const METRICS = [
  "ttft",
  "completion_tokens",
  "tps",
  "startup_time",
  "peak_rss",
] as const;
export type MetricName = (typeof METRICS)[number];

const METRIC_LABELS: Readonly<Record<MetricName, string>> = {
  ttft: "TTFT",
  completion_tokens: "Completion tokens",
  tps: "TPS",
  startup_time: "Startup",
  peak_rss: "Peak RSS",
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

export type ComparisonResult = {
  schemaVersion: 1;
  generatedAt: string;
  inputSha256: string;
  procedure: string;
  runs: ReadonlyArray<Run>;
};

function object(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${what} to be an object`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, what: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected ${what} to be a nonempty string`);
  }
  return value;
}

function parseCondition(
  value: unknown,
): Record<string, string | number | boolean> {
  const data = object(value, "condition");
  for (const [key, field] of Object.entries(data)) {
    if (
      typeof field !== "string" &&
      typeof field !== "boolean" &&
      !(typeof field === "number" && Number.isFinite(field))
    ) {
      throw new Error(`Invalid condition value for "${key}"`);
    }
  }
  return data as Record<string, string | number | boolean>;
}

function parseMeasurement(value: unknown, name: string): Measurement {
  const data = object(value, `metrics.${name}`);
  const unit = nonEmptyString(data.unit, `metrics.${name}.unit`);
  if (data.value === null) {
    if (!GAP_REASONS.includes(data.reason as GapReason)) {
      throw new Error(
        `metrics.${name} is missing but has no recognised gap reason`,
      );
    }
    return { value: null, unit, reason: data.reason as GapReason };
  }
  if (
    typeof data.value === "number" &&
    Number.isFinite(data.value) &&
    data.value >= 0 &&
    (data.source === "client" || data.source === "usage")
  ) {
    return {
      value: data.value,
      unit,
      source: data.source as "client" | "usage",
    };
  }
  throw new Error(
    `metrics.${name} must be a nonnegative measurement or a null value with a gap reason`,
  );
}

function parseMetrics(value: unknown): Record<MetricName, Measurement> {
  const data = object(value, "metrics");
  const metrics = {} as Record<MetricName, Measurement>;
  for (const name of METRICS) {
    metrics[name] = parseMeasurement(data[name], name);
  }
  return metrics;
}

function parseFailure(
  value: unknown,
  status: Run["status"],
): Run["failure"] {
  if (status === "measured") {
    if (value !== undefined) {
      throw new Error("A measured run must not carry a failure code");
    }
    return undefined;
  }
  const data = object(value, "failure");
  if (!FAILURE_CODES.includes(data.code as FailureCode)) {
    throw new Error("A failed run must carry one of the fixed failure codes");
  }
  return { code: data.code as FailureCode };
}

function parseRun(value: unknown): Run {
  const data = object(value, "run");
  if (!ENGINES.includes(data.engine as Engine)) {
    throw new Error(`Unknown engine: ${String(data.engine)}`);
  }
  if (data.status !== "measured" && data.status !== "failed") {
    throw new Error('status must be "measured" or "failed"');
  }
  const engine = data.engine as Engine;
  const status = data.status as Run["status"];
  return {
    engine,
    model: nonEmptyString(data.model, "model"),
    runtimeVersion: nonEmptyString(data.runtimeVersion, "runtimeVersion"),
    condition: parseCondition(data.condition),
    status,
    failure: parseFailure(data.failure, status),
    metrics: parseMetrics(data.metrics),
  };
}

export function parseComparisonResult(input: unknown): ComparisonResult {
  const data = object(input, "result");
  if (data.schemaVersion !== 1) {
    throw new Error("Expected schemaVersion 1");
  }
  const generatedAt = nonEmptyString(data.generatedAt, "generatedAt");
  if (Number.isNaN(Date.parse(generatedAt))) {
    throw new Error("generatedAt must be a valid ISO timestamp");
  }
  const inputSha256 = nonEmptyString(data.inputSha256, "inputSha256");
  if (!/^[0-9a-f]{64}$/.test(inputSha256)) {
    throw new Error("inputSha256 must be a 64-character hex digest");
  }
  const procedure = nonEmptyString(data.procedure, "procedure");
  if (!Array.isArray(data.runs)) {
    throw new Error("Expected runs to be an array");
  }
  if (data.runs.length === 0) {
    throw new Error("Expected a nonempty runs array");
  }
  const seen = new Set<Engine>();
  const runs = data.runs.map((run) => {
    const parsed = parseRun(run);
    if (seen.has(parsed.engine)) {
      throw new Error(`Duplicate engine in runs: ${parsed.engine}`);
    }
    seen.add(parsed.engine);
    return parsed;
  });
  return { schemaVersion: 1, generatedAt, inputSha256, procedure, runs };
}

// Markdown table cells must not carry raw table syntax or HTML.
function cell(value: string): string {
  return value.replace(/[&<>|`*_[\]\\\r\n]/g, (char) =>
    char === "\n" || char === "\r" ? " " : `&#${char.charCodeAt(0)};`,
  );
}

function conditionText(condition: Run["condition"]): string {
  const keys = Object.keys(condition).sort();
  return keys.length === 0
    ? "(none stated)"
    : keys.map((key) => `${key}=${String(condition[key])}`).join("; ");
}

function measurementText(measurement: Measurement): string {
  return measurement.value === null
    ? `欠測 (${measurement.reason})`
    : `${measurement.value} ${measurement.unit}`;
}

function failureText(run: Run): string {
  return run.failure ? run.failure.code : "—";
}

function renderRow(run: Run): string {
  const cells = [
    ENGINE_LABELS[run.engine],
    run.model,
    run.runtimeVersion,
    run.status,
    conditionText(run.condition),
    ...METRICS.map((name) => measurementText(run.metrics[name])),
    failureText(run),
  ].map((value) => cell(String(value)));
  return `| ${cells.join(" | ")} |`;
}

/** Rows always appear in the fixed engine order, independent of input order. */
export function renderComparisonMarkdown(input: unknown): string {
  const result = parseComparisonResult(input);
  const rows = ENGINES.map((engine) =>
    result.runs.find((run) => run.engine === engine),
  ).filter((run): run is Run => run !== undefined);
  const missing = ENGINES.filter(
    (engine) => !rows.some((run) => run.engine === engine),
  );
  const missingLabel = missing
    .map((engine) => ENGINE_LABELS[engine])
    .join(", ");

  const header = [
    "Engine",
    "Model",
    "Runtime",
    "Status",
    "Condition",
    ...METRICS.map((name) => METRIC_LABELS[name]),
    "不採用理由 (failure code)",
  ];

  return [
    "# Local inference comparison: gaps and failures",
    "",
    `Generated ${result.generatedAt} from input ${result.inputSha256}. Procedure: ${result.procedure}.`,
    "",
    "Every engine is one row, in the fixed order Ollama, llama.cpp, MLX, Strata. A missing metric (欠測) keeps its gap reason — `NO-FIELD`, `NOT-RUN` or `MEASURE-FAILED` — instead of a blank cell or a zero. A run that was not adopted into the comparison (不採用) carries one of eight fixed failure codes in the last column; a measured run shows `—` there because nothing was rejected.",
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map(renderRow),
    "",
    ...(missing.length
      ? [`No result was recorded for: ${missingLabel}.`, ""]
      : []),
  ].join("\n");
}
