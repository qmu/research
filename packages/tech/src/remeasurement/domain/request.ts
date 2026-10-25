import { createHash } from "node:crypto";

export interface RemeasurementIdentity {
  targetCommit: string;
  runnerVersion: string;
  fixtureIds: string[];
  executionVersion: number;
}

/** The caller pins fixture revisions in their IDs; order and repeats are immaterial. */
export function requestIdentity(value: unknown): RemeasurementIdentity {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-REMEASUREMENT-IDENTITY");
  const data = value as Record<string, unknown>;
  if (
    typeof data.targetCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(data.targetCommit) ||
    typeof data.runnerVersion !== "string" ||
    !/^local-inference\/[234]$/.test(data.runnerVersion) ||
    !Number.isSafeInteger(data.executionVersion) ||
    (data.executionVersion as number) < 1 ||
    !Array.isArray(data.fixtureIds) ||
    data.fixtureIds.length === 0 ||
    data.fixtureIds.length > 10000 ||
    data.fixtureIds.some(
      (id: unknown) =>
        typeof id !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/.test(id),
    )
  )
    throw new Error("INVALID-REMEASUREMENT-IDENTITY");
  return {
    targetCommit: data.targetCommit,
    runnerVersion: data.runnerVersion,
    fixtureIds: [...new Set(data.fixtureIds as string[])].sort(),
    executionVersion: data.executionVersion as number,
  };
}

export function remeasurementRequest(value: unknown) {
  const identity = requestIdentity(value);
  const digest = createHash("sha256")
    .update(JSON.stringify(["remeasurement-request/1", identity]))
    .digest("hex");
  return {
    kind: "remeasurement-request" as const,
    schemaVersion: 1 as const,
    idempotencyKey: `remeasurement-v1-${digest}`,
    ...identity,
  };
}
