/** Engine timing observations, distinct from client-observed streaming throughput. */
export type StrataSpeedMeasurement =
  | { value: number; unit: "tokens/s"; source: "engine" }
  | {
      value: null;
      unit: "tokens/s";
      reason: "NO-FIELD" | "MEASURE-FAILED";
    };

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Import one parsed Strata bench outputs.jsonl record; never infer client tps. */
export function normalizeStrataSpeed(record: unknown): {
  prompt_tps: StrataSpeedMeasurement;
  generation_tps: StrataSpeedMeasurement;
} {
  const row = object(record);
  const timings = object(row.timings);
  const failed =
    row.error !== null ||
    typeof row.http_status !== "number" ||
    !Number.isInteger(row.http_status) ||
    row.http_status < 200 ||
    row.http_status >= 300 ||
    !["stop", "length", "tool_calls"].includes(String(row.finish_reason));
  const speed = (value: unknown): StrataSpeedMeasurement => {
    if (failed) {
      return { value: null, unit: "tokens/s", reason: "MEASURE-FAILED" };
    }
    if (value === null || value === undefined) {
      return { value: null, unit: "tokens/s", reason: "NO-FIELD" };
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return { value: null, unit: "tokens/s", reason: "MEASURE-FAILED" };
    }
    return { value, unit: "tokens/s", source: "engine" };
  };
  return {
    prompt_tps: speed(timings.prompt_per_second),
    generation_tps: speed(timings.predicted_per_second),
  };
}
