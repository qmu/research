import { normalizeStrataTtft } from "../vendors/strata-ttft.js";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Patch only an explicitly selected Strata run; preserve other observations. */
export function withRecordedStrataTtft(
  input: unknown,
  record: unknown,
  runIndex: number,
) {
  if (
    !object(input) ||
    input.schemaVersion !== 1 ||
    !Array.isArray(input.runs) ||
    !Number.isInteger(runIndex) ||
    runIndex < 0
  ) {
    throw new Error("Expected schemaVersion 1 inference JSON and a run index");
  }
  const run: unknown = input.runs[runIndex];
  if (!object(run) || run.engine !== "strata" || !object(run.metrics)) {
    throw new Error("Selected run must be Strata with metrics");
  }
  const updated = {
    ...run,
    metrics: { ...run.metrics, ttft: normalizeStrataTtft(record) },
  };
  return {
    ...input,
    runs: input.runs.map((row: unknown, index: number) =>
      index === runIndex ? updated : row,
    ),
  };
}
