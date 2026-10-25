// A saved comparison snapshot: one row of a prior local-inference comparison
// run, carrying only the public, non-secret fields needed to show how the
// adoption verdict was reached and how the configuration can be reproduced.

export type AdoptionVerdict = "adopted" | "rejected";

export type ComparisonSnapshot = Readonly<{
  id: string;
  engineVersion: string;
  model: string;
  fixtureVersion: string;
  runnerVersion: string;
  verdict: AdoptionVerdict;
  reasonCode?: string;
}>;

export type ComparisonSnapshotFile = Readonly<{
  schemaVersion: 1;
  snapshots: ReadonlyArray<ComparisonSnapshot>;
}>;

const REQUIRED_STRING_FIELDS = [
  "id",
  "engineVersion",
  "model",
  "fixtureVersion",
  "runnerVersion",
] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseSnapshot = (raw: unknown, index: number): ComparisonSnapshot => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`snapshots[${index}] must be an object`);
  }
  const record = raw as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(record[field])) {
      throw new Error(
        `snapshots[${index}].${field} must be a nonempty string`,
      );
    }
  }

  if (record.verdict !== "adopted" && record.verdict !== "rejected") {
    throw new Error(
      `snapshots[${index}].verdict must be "adopted" or "rejected"`,
    );
  }

  if (
    record.reasonCode !== undefined &&
    !isNonEmptyString(record.reasonCode)
  ) {
    throw new Error(
      `snapshots[${index}].reasonCode must be a nonempty string when present`,
    );
  }

  if (record.verdict === "rejected" && record.reasonCode === undefined) {
    throw new Error(
      `snapshots[${index}] is "rejected" but carries no reasonCode`,
    );
  }

  return {
    id: record.id as string,
    engineVersion: record.engineVersion as string,
    model: record.model as string,
    fixtureVersion: record.fixtureVersion as string,
    runnerVersion: record.runnerVersion as string,
    verdict: record.verdict as "adopted" | "rejected",
    ...(record.reasonCode === undefined
      ? {}
      : { reasonCode: record.reasonCode as string }),
  };
};

/**
 * Parses and strictly validates a saved comparison snapshot file. Only the
 * allowlisted fields above are ever read — an input carrying extra keys (a
 * leftover raw command, a credential) has them silently ignored rather than
 * copied through to the rendered page.
 */
export const parseComparisonSnapshotFile = (
  raw: unknown,
): ComparisonSnapshotFile => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("comparison snapshot file must be an object");
  }
  const record = raw as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    throw new Error(
      `unsupported schemaVersion: ${JSON.stringify(record.schemaVersion)}`,
    );
  }
  if (!Array.isArray(record.snapshots)) {
    throw new Error("comparison snapshot file must have a snapshots array");
  }

  const snapshots = record.snapshots.map((entry, index) =>
    parseSnapshot(entry, index),
  );

  const seenIds = new Set<string>();
  for (const snapshot of snapshots) {
    if (seenIds.has(snapshot.id)) {
      throw new Error(`duplicate snapshot id: ${snapshot.id}`);
    }
    seenIds.add(snapshot.id);
  }

  return { schemaVersion: 1, snapshots };
};
