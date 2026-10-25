import { checkRunnerVersion } from "./runner-version.js";

export interface RemeasurementContext {
  runId: string;
  targetCommit: string;
  runnerVersion: string;
}

/** Only the snapshot's own complete identity can enable a remeasurement entry. */
export function remeasurementContext(
  value: unknown,
): RemeasurementContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const execution = value as Record<string, unknown>;
  // IDs are opaque, bounded tokens, never commands, paths or markup.
  if (
    typeof execution.runId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(execution.runId) ||
    typeof execution.targetCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(execution.targetCommit)
  )
    return null;
  const runner = checkRunnerVersion(execution.runnerVersion);
  if (!runner.version) return null;
  return {
    runId: execution.runId,
    targetCommit: execution.targetCommit,
    runnerVersion: runner.version,
  };
}

/** Fixed local anchor; identity comes from the rendered snapshot, not URL parameters. */
export const remeasurementAnchor = (sourceIndex: number) =>
  `remeasure-source-${sourceIndex + 1}`;

/** Reject a different artifact before handing a plan to any downstream consumer. */
export function verifyRemeasurementSnapshot(
  snapshot: unknown,
  expected: RemeasurementContext,
): RemeasurementContext {
  const data = snapshot as Record<string, unknown> | null;
  const actual = remeasurementContext(data?.execution);
  const validExpected = remeasurementContext(expected);
  if (
    !data ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.runs) ||
    !data.runs.length ||
    !actual ||
    !validExpected ||
    actual.runId !== validExpected.runId ||
    actual.targetCommit !== validExpected.targetCommit ||
    actual.runnerVersion !== validExpected.runnerVersion
  )
    throw new Error("SNAPSHOT-IDENTITY-MISMATCH");
  return actual;
}
