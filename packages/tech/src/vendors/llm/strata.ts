import type { Completion } from "./types";

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid Strata result: expected an object");
  }
  return value as Record<string, unknown>;
};

const nonnegative = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid Strata result: ${field} must be a finite nonnegative number`,
    );
  }
  return value;
};

// Import one Strata bench outputs.jsonl record, not an HTTP/SSE response or
// results.json summary. The model comes from the run's provenance: outputs.jsonl
// deliberately omits it. Keep this pure so saved measurements need no live server.
export const normalizeStrataCompletion = (
  input: unknown,
  model: string,
): Completion => {
  const result = record(input);
  if (typeof model !== "string" || model.trim().length === 0) {
    throw new Error("Invalid Strata result: model provenance is required");
  }
  if (result.error !== null || result.http_status !== 200) {
    // Do not echo upstream errors, which can include credentials or hostnames.
    throw new Error("Invalid Strata result: failed or missing request status");
  }
  if (result.finish_reason !== "stop" && result.finish_reason !== "length") {
    throw new Error(
      "Invalid Strata result: expected a finished text completion",
    );
  }
  if (typeof result.final_answer !== "string") {
    throw new Error("Invalid Strata result: final_answer must be a string");
  }
  const outputTokens = nonnegative(
    record(result.usage).completion_tokens,
    "usage.completion_tokens",
  );
  if (!Number.isSafeInteger(outputTokens)) {
    throw new Error(
      "Invalid Strata result: completion_tokens must be a safe integer",
    );
  }
  const start = nonnegative(result.dispatch_offset_s, "dispatch_offset_s");
  const end = nonnegative(result.end_offset_s, "end_offset_s");
  // Client end-to-end time only; engine prompt/decode timings are not substitutes.
  const elapsedMs = nonnegative((end - start) * 1000, "elapsedMs");
  return { text: result.final_answer, outputTokens, elapsedMs, model };
};
