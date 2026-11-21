export interface AdoptionIdentity {
  targetCommit: string;
  runnerVersion: string;
  runId: string;
}
type Reason =
  | "MISSING-COMMIT"
  | "COMMIT-MISMATCH"
  | "MISSING-RUNNER-VERSION"
  | "RUNNER-VERSION-MISMATCH"
  | "MISSING-RUN-ID"
  | "RUN-ID-MISMATCH";
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Read boundary only: matching provenance does not imply quality approval.
 * Feed only eligible artifacts to adoption/group/evaluator calculations.
 * Keep excluded originals as evidence, without rewriting metrics or quality.
 */
export function readSavedForAdoption<T>(
  saved: readonly T[],
  current: AdoptionIdentity,
): {
  eligible: T[];
  excluded: { sourceIndex: number; reasons: Reason[]; evidence: T }[];
} {
  if (
    !current ||
    !/^[a-f0-9]{40}$/.test(current.targetCommit) ||
    !text(current.runnerVersion) ||
    !text(current.runId)
  )
    throw new Error("INVALID-ADOPTION-IDENTITY");
  const eligible: T[] = [];
  const excluded: {
    sourceIndex: number;
    reasons: Reason[];
    evidence: T;
  }[] = [];
  saved.forEach((evidence, sourceIndex) => {
    const execution = object(object(evidence).execution);
    const reasons: Reason[] = [];
    if (!text(execution.targetCommit)) reasons.push("MISSING-COMMIT");
    else if (execution.targetCommit !== current.targetCommit)
      reasons.push("COMMIT-MISMATCH");
    if (!text(execution.runnerVersion)) reasons.push("MISSING-RUNNER-VERSION");
    else if (execution.runnerVersion !== current.runnerVersion)
      reasons.push("RUNNER-VERSION-MISMATCH");
    if (!text(execution.runId)) reasons.push("MISSING-RUN-ID");
    else if (execution.runId !== current.runId) reasons.push("RUN-ID-MISMATCH");
    if (reasons.length) excluded.push({ sourceIndex, reasons, evidence });
    else eligible.push(evidence);
  });
  return { eligible, excluded };
}
