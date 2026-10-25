import { checkRunnerVersion } from "./runner-version.js";

export interface TtftIdentity {
  runId: string;
  runnerVersion: string;
  targetCommit: string;
}
export interface TtftDecision {
  value: number | null;
  unit: "s";
  reasons: string[];
}
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** The caller supplies the intended execution independently of the saved JSON. */
export function validateTtftIdentity(identity: TtftIdentity): void {
  if (
    !identity ||
    !text(identity.runId) ||
    checkRunnerVersion(identity.runnerVersion).recovery ||
    !/^[a-f0-9]{40}$/.test(identity.targetCommit)
  )
    throw new Error("INVALID-TTFT-IDENTITY");
}

/** No inference from throughput, model identity, timestamps or another run. */
export function adoptSavedTtft(
  execution: unknown,
  run: unknown,
  expected?: TtftIdentity,
): TtftDecision {
  const reject = (...reasons: string[]): TtftDecision => ({
    value: null,
    unit: "s",
    reasons,
  });
  if (!expected) return reject("TTFT-IDENTITY-NOT-SELECTED");
  validateTtftIdentity(expected);
  const row = object(run);
  const saved: Record<string, unknown> = {
    ...object(execution),
    runId: row.runId,
  };
  const reasons: string[] = [];
  for (const [key, label] of [
    ["runId", "RUN-ID"],
    ["runnerVersion", "RUNNER-VERSION"],
    ["targetCommit", "COMMIT"],
  ] as const) {
    if (!text(saved[key])) reasons.push(`MISSING-${label}`);
    else if (saved[key] !== expected[key]) reasons.push(`${label}-MISMATCH`);
  }
  if (reasons.length) return reject(...reasons);
  const metric = object(object(row.metrics).ttft);
  // Acquisition reasons are trusted only after identity and shape checks.
  if (Object.hasOwn(row, "ttft")) {
    const recorded = object(row.ttft);
    const missing =
      metric.value === null &&
      metric.unit === "s" &&
      !Object.hasOwn(metric, "source") &&
      recorded.value === null &&
      recorded.unit === "s" &&
      !Object.hasOwn(recorded, "source");
    if (row.status === "failed") {
      const failureReasons = [
        "HTTP-ERROR",
        "NO-BODY",
        "INVALID-STREAM",
        "STREAM-ERROR",
        "INCOMPLETE-STREAM",
        "TIMEOUT",
        "REQUEST-FAILED",
      ];
      return missing &&
        metric.reason === "MEASURE-FAILED" &&
        typeof recorded.reason === "string" &&
        failureReasons.includes(recorded.reason)
        ? reject(recorded.reason)
        : reject("INVALID-TTFT");
    }
    if (row.status !== "measured") return reject("INVALID-TTFT");
    if (recorded.reason === "NO-CONTENT")
      return missing && metric.reason === "NO-FIELD"
        ? reject("NO-CONTENT")
        : reject("INVALID-TTFT");
    if (
      recorded.reason !== "FIRST-CONTENT" ||
      typeof metric.value !== "number" ||
      recorded.value !== metric.value ||
      recorded.unit !== metric.unit ||
      recorded.source !== metric.source
    )
      return reject("INVALID-TTFT");
  }
  if (row.status !== "measured") return reject("MEASURE-FAILED");
  if (!Object.keys(metric).length) return reject("NO-FIELD");
  if (
    metric.value === null &&
    metric.unit === "s" &&
    !Object.hasOwn(metric, "source") &&
    ["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"].includes(String(metric.reason))
  )
    return reject(String(metric.reason));
  if (
    typeof metric.value !== "number" ||
    !Number.isFinite(metric.value) ||
    metric.value < 0 ||
    metric.unit !== "s" ||
    metric.source !== "client" ||
    Object.hasOwn(metric, "reason")
  )
    return reject("INVALID-TTFT");
  return { value: metric.value, unit: "s", reasons: [] };
}
