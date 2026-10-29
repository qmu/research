import { describe, expect, it, vi } from "vitest";
import {
  DUPLICATE_ADOPTION_ROW,
  INVALID_ADOPTION_IDENTITY,
  publishUniqueAdoptionRows,
} from "./unique.js";

const row = {
  engine: "strata",
  model: "model-a",
  fixture: "quality-v1",
  runnerVersion: "runner-v1",
  decision: "adopt",
};

describe("adoption publication uniqueness", () => {
  it("rejects a late duplicate before publishing even when decisions or runs differ", () => {
    const publish = vi.fn();
    expect(() =>
      publishUniqueAdoptionRows(
        [
          row,
          { ...row, model: "other" },
          { ...row, decision: "reject", runId: "new" },
        ],
        publish,
      ),
    ).toThrow(DUPLICATE_ADOPTION_ROW);
    expect(publish).not.toHaveBeenCalled();
  });

  it.each(["engine", "model", "fixture", "runnerVersion"] as const)(
    "distinguishes a different %s",
    (field) => {
      const rows = Object.freeze([
        Object.freeze(row),
        Object.freeze({ ...row, [field]: "other" }),
      ]);
      const publish = vi.fn();
      publishUniqueAdoptionRows(rows, publish);
      expect(publish).toHaveBeenCalledExactlyOnceWith(rows);
    },
  );

  it("uses tuple identity without delimiter collisions", () => {
    const publish = vi.fn();
    publishUniqueAdoptionRows(
      [
        { ...row, engine: "a|b", model: "c" },
        { ...row, engine: "a", model: "b|c" },
      ],
      publish,
    );
    expect(publish).toHaveBeenCalledOnce();
  });

  it.each(["engine", "model", "fixture", "runnerVersion"] as const)(
    "rejects missing, non-string, empty and padded %s without publishing",
    (field) => {
      for (const value of [undefined, null, 1, "", " ", " padded"]) {
        const publish = vi.fn();
        expect(() =>
          publishUniqueAdoptionRows([row, { ...row, [field]: value }], publish),
        ).toThrow(INVALID_ADOPTION_IDENTITY);
        expect(publish).not.toHaveBeenCalled();
      }
    },
  );

  it.each([null, 1, "row", [], {}])(
    "rejects malformed rows (%j)",
    (invalid) => {
      const publish = vi.fn();
      expect(() => publishUniqueAdoptionRows([row, invalid], publish)).toThrow(
        INVALID_ADOPTION_IDENTITY,
      );
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it("gives invalid identity precedence regardless of duplicate order", () => {
    for (const rows of [
      [row, row, {}],
      [{}, row, row],
    ]) {
      expect(() => publishUniqueAdoptionRows(rows, vi.fn())).toThrow(
        INVALID_ADOPTION_IDENTITY,
      );
    }
  });
});
