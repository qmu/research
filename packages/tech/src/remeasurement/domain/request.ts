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
    data.targetCommit.length !== 40 ||
    !/^[a-f0-9]{40}$/.test(data.targetCommit) ||
    typeof data.runnerVersion !== "string" ||
    !["local-inference/2", "local-inference/3", "local-inference/4"].includes(
      data.runnerVersion,
    ) ||
    !Number.isSafeInteger(data.executionVersion) ||
    (data.executionVersion as number) < 1 ||
    !Array.isArray(data.fixtureIds) ||
    data.fixtureIds.length === 0 ||
    data.fixtureIds.length > 10000 ||
    Array.from(data.fixtureIds).some(
      (id: unknown) =>
        typeof id !== "string" ||
        id.trim() !== id ||
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

export interface FailedSnapshotSource {
  runId: string;
  targetCommit: string;
  runnerVersion: string;
}

function failedSnapshotSource(
  value: unknown,
  identity: RemeasurementIdentity,
): FailedSnapshotSource {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-REMEASUREMENT-SOURCE");
  const source = value as Record<string, unknown>;
  if (
    typeof source.runId !== "string" ||
    source.runId.trim() !== source.runId ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(source.runId) ||
    source.targetCommit !== identity.targetCommit ||
    source.runnerVersion !== identity.runnerVersion
  )
    throw new Error("INVALID-REMEASUREMENT-SOURCE");
  return {
    runId: source.runId,
    targetCommit: identity.targetCommit,
    runnerVersion: identity.runnerVersion,
  };
}

export function remeasurementRequest(value: unknown) {
  const identity = requestIdentity(value);
  const data = value as Record<string, unknown>;
  // A supplied reference is never silently discarded or repaired. Keep it out
  // of the key so a different source for the same execution is a conflict.
  const source = Object.hasOwn(data, "source")
    ? failedSnapshotSource(data.source, identity)
    : undefined;
  const digest = createHash("sha256")
    .update(JSON.stringify(["remeasurement-request/1", identity]))
    .digest("hex");
  return {
    kind: "remeasurement-request" as const,
    schemaVersion: 1 as const,
    idempotencyKey: `remeasurement-v1-${digest}`,
    ...identity,
    ...(source ? { source } : {}),
  };
}
