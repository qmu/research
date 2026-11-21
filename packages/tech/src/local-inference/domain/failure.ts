import {
  failureReproduction,
  type FailureReproductionInput,
} from "./reproduction.js";

/** Failure-only boundary: callers keep their successful observations unchanged. */
export type FailureEngine = "ollama" | "llama.cpp" | "mlx" | "strata";
export const failureCodes = [
  "TIMEOUT",
  "OUT-OF-MEMORY",
  "MODEL-NOT-FOUND",
  "NOT-LOADABLE",
  "UNSUPPORTED",
  "UNREACHABLE",
  "CANCELLED",
  "MEASURE-FAILED",
] as const;
export type FailureCode = (typeof failureCodes)[number];

/** Supply only after failure. Raw diagnostics are inspected, never returned. */
export type FailureInput = {
  engine: FailureEngine;
  timedOut?: boolean;
  cancelled?: boolean;
  exitCode?: number | null;
  signal?: string | null;
  httpStatus?: number;
  error?: unknown;
  stderr?: string;
  reproduction?: FailureReproductionInput;
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Bounded cause traversal supports fetch errors and native API error envelopes. */
function diagnostic(error: unknown, depth = 0): string {
  if (depth > 3) return "";
  if (typeof error === "string") return error;
  const e = record(error);
  return [
    e.name,
    e.code,
    e.type,
    e.message,
    diagnostic(e.error, depth + 1),
    diagnostic(e.cause, depth + 1),
  ]
    .filter((v) => typeof v === "string")
    .join(" ");
}

export function classifyFailure(input: FailureInput): FailureCode {
  const text = diagnostic(input.error) + " " + (input.stderr ?? "");
  // Explicit deadline beats the abort used to enforce it. A kill alone is not OOM.
  if (
    input.timedOut ||
    /\b(TimeoutError|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT)\b/i.test(text)
  )
    return "TIMEOUT";
  if (input.cancelled || input.signal === "SIGINT") return "CANCELLED";
  if (
    /out of memory|\boom\b|failed to allocate|cannot allocate memory|insufficient (system |device |gpu )?memory|requires more .*memory|metal.*allocation.*failed/i.test(
      text,
    )
  )
    return "OUT-OF-MEMORY";
  if (
    /model[_ -]not[_ -]found|model .*not found|no such file or directory.*\.(gguf|safetensors)|repositorynotfounderror/i.test(
      text,
    )
  )
    return "MODEL-NOT-FOUND";
  if (
    /failed to load model|unable to load model|invalid (gguf|model|magic)|unsupported (model architecture|gguf|quantization)|failed to load.*(pack|gguf)|safetensorerror/i.test(
      text,
    )
  )
    return "NOT-LOADABLE";
  if (
    input.httpStatus === 501 ||
    /notimplementederror|unsupported (operation|feature)|not supported by this backend/i.test(
      text,
    )
  )
    return "UNSUPPORTED";
  if (/\b(ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ENETUNREACH)\b/i.test(text))
    return "UNREACHABLE";
  if (/\bAbortError\b/.test(text)) return "CANCELLED";
  return "MEASURE-FAILED";
}

/** JSON-safe failed row fragment, matching the common measurement gap shape. */
export function normalizeFailure(input: FailureInput) {
  // TypeScript callers are not the only consumers of this JSON boundary.
  if (!["ollama", "llama.cpp", "mlx", "strata"].includes(input.engine))
    throw new Error("Unsupported failure engine");
  const gap = (unit: string) => ({
    value: null,
    unit,
    reason: "MEASURE-FAILED" as const,
  });
  return {
    engine: input.engine,
    status: "failed" as const,
    failure: { code: classifyFailure(input) },
    reproduction: failureReproduction(input.reproduction),
    metrics: {
      ttft: gap("s"),
      completion_tokens: gap("tokens"),
      tps: gap("tokens/s"),
      startup_time: { value: null, unit: "s", reason: "NOT-RUN" as const },
      peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" as const },
    },
  };
}
