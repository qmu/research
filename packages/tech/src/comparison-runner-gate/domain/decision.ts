export type ComparisonRow = Readonly<{
  id: string;
  runnerVersion?: unknown;
}>;

export type AdoptionDecision = "adopt" | "reject" | "undetermined";

export type ComparisonDecision = Readonly<{
  id: string;
  eligible: boolean;
  decision: AdoptionDecision;
  reason: "RUNNER-VERSION-MISMATCH" | "MISSING-RUNNER-VERSION" | null;
  recovery: Readonly<{
    action: "remeasure";
    runnerVersion: string;
  }> | null;
}>;

/** Gate each row before invoking adoption logic; never compare different runners. */
export function decideComparisonRows<Row extends ComparisonRow>(
  rows: readonly Row[],
  expectedRunnerVersion: string,
  decide: (row: Row) => AdoptionDecision,
): readonly ComparisonDecision[] {
  if (
    typeof expectedRunnerVersion !== "string" ||
    expectedRunnerVersion.length === 0 ||
    expectedRunnerVersion.trim() !== expectedRunnerVersion
  ) {
    throw new TypeError(
      "Expected runner version must be a non-empty trimmed string",
    );
  }

  return rows.map((row): ComparisonDecision => {
    if (row.runnerVersion === expectedRunnerVersion) {
      return {
        id: row.id,
        eligible: true,
        decision: decide(row),
        reason: null,
        recovery: null,
      };
    }
    const missing =
      row.runnerVersion === null ||
      row.runnerVersion === undefined ||
      (typeof row.runnerVersion === "string" &&
        row.runnerVersion.trim().length === 0);
    return {
      id: row.id,
      eligible: false,
      decision: "undetermined",
      reason: missing ? "MISSING-RUNNER-VERSION" : "RUNNER-VERSION-MISMATCH",
      recovery: { action: "remeasure", runnerVersion: expectedRunnerVersion },
    };
  });
}
