// Validates the common local-inference JSON a measurement run writes before
// any of it reaches the renderer. Every value either carries a trustworthy
// measurement or a fixed, machine-readable reason it is missing; an
// unrecognised shape fails parsing instead of rendering as silent prose, a
// blank cell, or a misleading zero.

import {
  ENGINES,
  FAILURE_CODES,
  GAP_REASONS,
  METRICS,
  type Engine,
  type FailureCode,
  type GapReason,
  type Measurement,
  type MetricName,
  type Run,
  type UnifiedResult,
} from "./types";

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
      throw new Error(`Invalid gap reason for metrics.${name}`);
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
  throw new Error(`Invalid metrics.${name} value`);
}

function parseMetrics(value: unknown): Record<MetricName, Measurement> {
  const data = object(value, "metrics");
  const metrics = {} as Record<MetricName, Measurement>;
  for (const name of METRICS) {
    metrics[name] = parseMeasurement(data[name], name);
  }
  return metrics;
}

function parseFailure(value: unknown, status: Run["status"]): Run["failure"] {
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

export function parseUnifiedResult(input: unknown): UnifiedResult {
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
