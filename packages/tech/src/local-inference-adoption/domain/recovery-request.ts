import { remeasurementContext } from "./remeasurement.js";

export const snapshotFailureReasons = [
  "SNAPSHOT-READ-FAILED",
  "SNAPSHOT-JSON-INVALID",
  "SNAPSHOT-IDENTITY-MISMATCH",
] as const;

/** A request is not a verified snapshot or permission to adopt its metrics. */
export function snapshotRecoveryRequest(expected: unknown, reason: unknown) {
  const source = remeasurementContext(expected);
  if (!source || !snapshotFailureReasons.some((allowed) => allowed === reason))
    throw new Error("INVALID-RECOVERY-REQUEST");
  return {
    kind: "remeasurement-request" as const,
    schemaVersion: 1 as const,
    reason: reason as (typeof snapshotFailureReasons)[number],
    source,
    requiresNewExecutionId: true as const,
    requiresNewArtifact: true as const,
  };
}
