/** Wire order is explicit: provenance, conditions, measurement, then quality. */
export const ADOPTION_REASON_ORDER = Object.freeze([
  "MISSING-COMMIT",
  "COMMIT-MISMATCH",
  "MISSING-RUNNER-VERSION",
  "UNKNOWN-RUNNER-VERSION",
  "MISSING-FINGERPRINT",
  "MISSING-CONDITION",
  "MISSING-RUNTIME-VERSION",
  "MISSING-SAMPLING",
  "MISSING-INPUT-SHA256",
  "MISSING-PROCEDURE",
  "MISSING-QUALITY",
  "MEASURE-FAILED",
  "INPUT-MISMATCH",
  "NO-OUTPUT",
  "QUALITY-FAIL",
] as const);
export type AdoptionReason = (typeof ADOPTION_REASON_ORDER)[number];
export type SnapshotReasons = Readonly<{
  schemaVersion: 1;
  currentCommit: string;
  rows: ReadonlyArray<
    Readonly<{
      sourceIndex: number;
      runIndex: number;
      adoption: "pass" | "fail" | "undetermined";
      reasons: readonly AdoptionReason[];
    }>
  >;
  evaluatorMismatches: ReadonlyArray<
    Readonly<{
      rowIndexes: readonly [number, number];
      reason: "EVALUATOR-VERSION-MISMATCH";
    }>
  >;
}>;
export type SnapshotReasonResult =
  | Readonly<{ ok: true; snapshot: SnapshotReasons }>
  | Readonly<{
      ok: false;
      reason:
        | "INVALID-CURRENT-COMMIT"
        | "INVALID-SNAPSHOT"
        | "SNAPSHOT-COMMIT-MISMATCH";
    }>;

const record = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid snapshot object");
  return value as Record<string, unknown>;
};
const commit = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const index = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/**
 * Read an already computed AdoptionReport JSON; never evaluate measurements.
 * Unknown versions/reasons and contradictory verdicts fail closed, with no
 * partial rows or input-derived diagnostics. Extra evidence fields are omitted.
 */
export function readSavedComparisonReasons(
  snapshotJson: string,
  expectedCommit: string,
): SnapshotReasonResult {
  if (!commit(expectedCommit))
    return { ok: false, reason: "INVALID-CURRENT-COMMIT" };
  try {
    if (typeof snapshotJson !== "string") throw new Error("Expected JSON text");
    const data = record(JSON.parse(snapshotJson));
    if (
      data.schemaVersion !== 1 ||
      !commit(data.currentCommit) ||
      !Array.isArray(data.rows) ||
      data.rows.length === 0 ||
      !Array.isArray(data.evaluatorMismatches)
    )
      throw new Error("Invalid snapshot envelope");
    if (data.currentCommit !== expectedCommit)
      return { ok: false, reason: "SNAPSHOT-COMMIT-MISMATCH" };
    const identities = new Set<string>();
    const rows: SnapshotReasons["rows"] = data.rows.map((raw: unknown) => {
      const row = record(raw);
      if (
        !index(row.sourceIndex) ||
        !index(row.runIndex) ||
        typeof row.adoption !== "string" ||
        !["pass", "fail", "undetermined"].includes(row.adoption) ||
        !Array.isArray(row.reasons) ||
        !row.reasons.every(
          (reason: unknown) =>
            typeof reason === "string" &&
            (ADOPTION_REASON_ORDER as readonly string[]).includes(reason),
        )
      )
        throw new Error("Invalid adoption row");
      const identity = `${row.sourceIndex}:${row.runIndex}`;
      if (identities.has(identity)) throw new Error("Duplicate row");
      identities.add(identity);
      const reasons = ADOPTION_REASON_ORDER.filter((reason) =>
        (row.reasons as unknown[]).includes(reason),
      );
      if (
        (row.adoption === "pass" && reasons.length !== 0) ||
        (row.adoption === "fail" && !reasons.includes("QUALITY-FAIL")) ||
        (row.adoption === "undetermined" && reasons.length === 0)
      )
        throw new Error("Contradictory verdict");
      return {
        sourceIndex: row.sourceIndex,
        runIndex: row.runIndex,
        adoption: row.adoption as "pass" | "fail" | "undetermined",
        reasons,
      };
    });
    const pairs = new Map<string, readonly [number, number]>();
    for (const raw of data.evaluatorMismatches) {
      const mismatch = record(raw);
      const pair = mismatch.rowIndexes;
      if (
        mismatch.reason !== "EVALUATOR-VERSION-MISMATCH" ||
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        !index(pair[0]) ||
        !index(pair[1]) ||
        pair[0] === pair[1] ||
        pair[0] >= rows.length ||
        pair[1] >= rows.length
      )
        throw new Error("Invalid evaluator pair");
      const left = Math.min(pair[0], pair[1]);
      const right = Math.max(pair[0], pair[1]);
      pairs.set(`${left}:${right}`, [left, right]);
    }
    return {
      ok: true,
      snapshot: {
        schemaVersion: 1,
        currentCommit: data.currentCommit,
        rows,
        evaluatorMismatches: [...pairs.values()]
          .sort(([a, b], [c, d]) => a - c || b - d)
          .map((rowIndexes) => ({
            rowIndexes,
            reason: "EVALUATOR-VERSION-MISMATCH",
          })),
      },
    };
  } catch {
    return { ok: false, reason: "INVALID-SNAPSHOT" };
  }
}
