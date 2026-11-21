/** The comparison boundary supplies this trusted identity; never infer defaults. */
export type RunIdentity = {
  runId: string;
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  targetCommit: string;
};

export const missingReasons = [
  "NOT-RUN",
  "NO-FIELD",
  "MEASURE-FAILED",
] as const;
type MissingReason = (typeof missingReasons)[number];
const identityKeys = [
  "runId",
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-INPUT");
  return value as Record<string, unknown>;
}

function identity(value: unknown): RunIdentity {
  const input = object(value);
  for (const key of identityKeys) {
    const field = input[key];
    if (
      typeof field !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,199}$/.test(field) ||
      (key === "targetCommit" && !/^[a-f0-9]{40}$/.test(field))
    )
      throw new Error("INVALID-IDENTITY");
  }
  return Object.fromEntries(
    identityKeys.map((key) => [key, input[key]]),
  ) as RunIdentity;
}

/**
 * Convert a missing peak RSS to a request, not an execution or adoption result.
 * snapshot = { source: RunIdentity, metrics: { peak_rss: MemoryReading } }.
 * expected must come from the trusted comparison context, not snapshot.source.
 */
export function createPeakRssRemeasurementRequest(
  expected: unknown,
  snapshot: unknown,
) {
  const source = identity(expected);
  const saved = object(snapshot);
  const actual = identity(saved.source);
  if (identityKeys.some((key) => source[key] !== actual[key]))
    throw new Error("SOURCE-MISMATCH");
  const reading = object(object(saved.metrics).peak_rss);
  if (reading.unit !== "MiB") throw new Error("INVALID-PEAK-RSS");
  if (reading.value !== null) {
    if (
      typeof reading.value !== "number" ||
      !Number.isFinite(reading.value) ||
      reading.value <= 0 ||
      reading.reason !== undefined
    )
      throw new Error("INVALID-PEAK-RSS");
    return null;
  }
  if (!missingReasons.includes(reading.reason as MissingReason))
    throw new Error("INVALID-PEAK-RSS");
  return {
    schemaVersion: 1 as const,
    kind: "peak-rss-remeasurement-request" as const,
    source,
    metric: "peak_rss" as const,
    reason: reading.reason as MissingReason,
    requiresNewRunId: true as const,
    requiresNewArtifact: true as const,
  };
}
