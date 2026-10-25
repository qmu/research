import { describe, expect, it, vi } from "vitest";
import {
  DUPLICATE_SAVE_ROW,
  INVALID_SAVE_IDENTITY,
  saveUniqueRunRows,
} from "./guard.js";

const row = {
  engine: "strata",
  model: "model-a",
  fixture: "quality-v1",
  runnerVersion: "runner-v1",
  targetCommit: "a1b2c3d",
};

describe("save-time run row uniqueness", () => {
  it("rejects a late duplicate before saving even when decisions or runs differ", () => {
    const save = vi.fn();
    expect(() =>
      saveUniqueRunRows(
        [
          row,
          { ...row, model: "other" },
          { ...row, decision: "reject", runId: "new" },
        ],
        save,
      ),
    ).toThrow(DUPLICATE_SAVE_ROW);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    "engine",
    "model",
    "fixture",
    "runnerVersion",
    "targetCommit",
  ] as const)("distinguishes a different %s", (field) => {
    const rows = Object.freeze([
      Object.freeze(row),
      Object.freeze({ ...row, [field]: "other" }),
    ]);
    const save = vi.fn();
    saveUniqueRunRows(rows, save);
    expect(save).toHaveBeenCalledExactlyOnceWith(rows);
  });

  it("uses tuple identity without delimiter collisions", () => {
    const save = vi.fn();
    saveUniqueRunRows(
      [
        { ...row, engine: "a|b", model: "c" },
        { ...row, engine: "a", model: "b|c" },
      ],
      save,
    );
    expect(save).toHaveBeenCalledOnce();
  });

  it.each([
    "engine",
    "model",
    "fixture",
    "runnerVersion",
    "targetCommit",
  ] as const)(
    "rejects missing, non-string, empty and padded %s without saving",
    (field) => {
      for (const value of [undefined, null, 1, "", " ", " padded"]) {
        const save = vi.fn();
        expect(() =>
          saveUniqueRunRows([row, { ...row, [field]: value }], save),
        ).toThrow(INVALID_SAVE_IDENTITY);
        expect(save).not.toHaveBeenCalled();
      }
    },
  );

  it.each([null, 1, "row", [], {}])(
    "rejects malformed rows (%j)",
    (invalid) => {
      const save = vi.fn();
      expect(() => saveUniqueRunRows([row, invalid], save)).toThrow(
        INVALID_SAVE_IDENTITY,
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it("gives invalid identity precedence regardless of duplicate order", () => {
    for (const rows of [
      [row, row, {}],
      [{}, row, row],
    ]) {
      expect(() => saveUniqueRunRows(rows, vi.fn())).toThrow(
        INVALID_SAVE_IDENTITY,
      );
    }
  });

  it("rejects a non-array batch without saving", () => {
    const save = vi.fn();
    expect(() => saveUniqueRunRows("not-an-array" as never, save)).toThrow(
      INVALID_SAVE_IDENTITY,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("does not mutate the input and preserves row order on success", () => {
    const rows = Object.freeze([
      Object.freeze(row),
      Object.freeze({ ...row, targetCommit: "deadbee" }),
    ]);
    const save = vi.fn();
    saveUniqueRunRows(rows, save);
    expect(save).toHaveBeenCalledExactlyOnceWith(rows);
  });
});
