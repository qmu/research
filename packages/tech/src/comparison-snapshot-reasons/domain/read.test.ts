import { describe, expect, it } from "vitest";
import { ADOPTION_REASON_ORDER, readSavedComparisonReasons } from "../index";

const sha = "a".repeat(40);
const row = (reasons: unknown[] = [], adoption = "pass", runIndex = 0) => ({
  sourceIndex: 0,
  runIndex,
  adoption,
  reasons,
});
const snapshot = (
  rows: Record<string, unknown>[] = [row()],
  evaluatorMismatches: unknown[] = [],
) => ({
  schemaVersion: 1,
  currentCommit: sha,
  rows,
  evaluatorMismatches,
});
const read = (value: unknown, expectedCommit = sha) =>
  readSavedComparisonReasons(JSON.stringify(value), expectedCommit);
const invalid = { ok: false, reason: "INVALID-SNAPSHOT" };

describe("public saved comparison reason API", () => {
  it("keeps a recorded pass and strips raw evidence", () => {
    const data = snapshot([{ ...row(), error: "private raw evidence" }]);
    expect(read(data)).toEqual({ ok: true, snapshot: snapshot() });
  });

  it("uses explicit provenance/condition/measurement/quality order and deduplicates", () => {
    const data = snapshot([
      row(
        [...ADOPTION_REASON_ORDER].reverse().concat("MEASURE-FAILED"),
        "undetermined",
      ),
    ]);
    const original = JSON.stringify(data);
    expect(read(data)).toEqual({
      ok: true,
      snapshot: snapshot([row([...ADOPTION_REASON_ORDER], "undetermined")]),
    });
    expect(JSON.stringify(data)).toBe(original);
    expect(read(data)).toEqual(read(data));
  });

  it("preserves row order and saved fail/undetermined verdicts", () => {
    const data = snapshot([
      row(["QUALITY-FAIL", "MEASURE-FAILED"], "fail", 9),
      row(["MISSING-COMMIT"], "undetermined", 1),
    ]);
    expect(read(data)).toEqual({
      ok: true,
      snapshot: snapshot([
        row(["MEASURE-FAILED", "QUALITY-FAIL"], "fail", 9),
        row(["MISSING-COMMIT"], "undetermined", 1),
      ]),
    });
  });

  it("returns evaluator reasons as ordered pairs without changing adoption", () => {
    const mismatch = (a: number, b: number) => ({
      rowIndexes: [a, b],
      reason: "EVALUATOR-VERSION-MISMATCH",
    });
    const rows = [row(), row([], "pass", 1), row([], "pass", 2)];
    expect(
      read(snapshot(rows, [mismatch(2, 1), mismatch(1, 0), mismatch(0, 1)])),
    ).toEqual({
      ok: true,
      snapshot: snapshot(rows, [mismatch(0, 1), mismatch(1, 2)]),
    });
  });

  it("checks the caller's explicit commit before reading JSON", () => {
    expect(readSavedComparisonReasons("invalid JSON", "main")).toEqual({
      ok: false,
      reason: "INVALID-CURRENT-COMMIT",
    });
    expect(read(snapshot(), "b".repeat(40))).toEqual({
      ok: false,
      reason: "SNAPSHOT-COMMIT-MISMATCH",
    });
  });

  it.each(["", "{", "null", "[]"])("rejects malformed text %j", (text) => {
    expect(readSavedComparisonReasons(text, sha)).toEqual(invalid);
  });

  it.each([
    { ...snapshot(), schemaVersion: 2 },
    { ...snapshot(), currentCommit: "main" },
    { ...snapshot(), rows: [] },
    { ...snapshot(), evaluatorMismatches: null },
    snapshot([row(["FUTURE-REASON"], "undetermined")]),
    snapshot([row([null], "undetermined")]),
    snapshot([row(["QUALITY-FAIL"], "pass")]),
    snapshot([row([], "undetermined")]),
    snapshot([row(["NO-OUTPUT"], "fail")]),
    snapshot([row([], "adopt")]),
    snapshot([{ ...row(), adoption: ["pass"] }]),
    snapshot([row(), row()]),
    snapshot([{ ...row(), sourceIndex: -1 }]),
    snapshot([{ ...row(), runIndex: 0.5 }]),
    snapshot([{ ...row(), runIndex: Number.MAX_SAFE_INTEGER + 1 }]),
    snapshot(
      [row()],
      [{ reason: "EVALUATOR-VERSION-MISMATCH", rowIndexes: [0, 1] }],
    ),
    snapshot(
      [row()],
      [{ reason: "EVALUATOR-VERSION-MISMATCH", rowIndexes: [0, 0] }],
    ),
    snapshot([row()], [{ reason: "unknown", rowIndexes: [0, 1] }]),
  ])("rejects invalid snapshots atomically %#", (data) => {
    expect(read(data)).toEqual(invalid);
  });

  it("never returns partial rows or untrusted diagnostics", () => {
    const data = snapshot([row(), row(["secret-input"], "undetermined", 1)]);
    expect(JSON.stringify(read(data))).not.toContain("secret-input");
    expect(read(data)).toEqual(invalid);
  });

  it("returns independent values on every call", () => {
    const data = snapshot([row(["NO-OUTPUT"], "undetermined")]);
    const first = read(data);
    if (!first.ok) throw new Error("Expected valid fixture");
    // Runtime consumers need not honor TypeScript readonly types.
    (first.snapshot.rows[0].reasons as string[]).push("QUALITY-FAIL");
    expect(read(data)).toEqual({ ok: true, snapshot: data });
  });
});
