import { describe, expect, it, vi } from "vitest";
import { decideComparisonRows } from "../index.js";

const version = "local-inference/4";

describe("decideComparisonRows", () => {
  it("excludes a recognized but different runner before adoption and preserves order", () => {
    const rows = Object.freeze([
      Object.freeze({
        id: "old",
        runnerVersion: "local-inference/3",
        speed: 100,
      }),
      Object.freeze({ id: "current", runnerVersion: version, speed: 10 }),
    ]);
    const decide = vi.fn(() => "adopt" as const);
    expect(decideComparisonRows(rows, version, decide)).toEqual([
      {
        id: "old",
        eligible: false,
        decision: "undetermined",
        reason: "RUNNER-VERSION-MISMATCH",
        recovery: { action: "remeasure", runnerVersion: version },
      },
      {
        id: "current",
        eligible: true,
        decision: "adopt",
        reason: null,
        recovery: null,
      },
    ]);
    expect(decide).toHaveBeenCalledExactlyOnceWith(rows[1]);
    expect(rows[0].speed).toBe(100);
  });

  it.each(["adopt", "reject", "undetermined"] as const)(
    "preserves the matching runner's %s decision",
    (decision) => {
      expect(
        decideComparisonRows(
          [{ id: "row", runnerVersion: version }],
          version,
          () => decision,
        )[0],
      ).toMatchObject({
        eligible: true,
        decision,
        reason: null,
        recovery: null,
      });
    },
  );

  it.each([undefined, null, "", " \t"])(
    "blocks missing version %s",
    (runnerVersion) => {
      const decide = vi.fn(() => "reject" as const);
      expect(
        decideComparisonRows(
          [{ id: "row", runnerVersion }],
          version,
          decide,
        )[0],
      ).toMatchObject({
        eligible: false,
        decision: "undetermined",
        reason: "MISSING-RUNNER-VERSION",
      });
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it.each([
    "local-inference/99",
    ` ${version}`,
    `${version} `,
    4,
    {},
    [version],
  ])(
    "blocks mismatched or malformed version %s without echoing it",
    (runnerVersion) => {
      const decide = vi.fn(() => "adopt" as const);
      expect(
        decideComparisonRows(
          [{ id: "row", runnerVersion }],
          version,
          decide,
        )[0],
      ).toEqual({
        id: "row",
        eligible: false,
        decision: "undetermined",
        reason: "RUNNER-VERSION-MISMATCH",
        recovery: { action: "remeasure", runnerVersion: version },
      });
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it.each(["", " ", " local-inference/4", "local-inference/4\n"])(
    "rejects invalid expected version %s before evaluating rows",
    (expected) => {
      const decide = vi.fn(() => "adopt" as const);
      expect(() =>
        decideComparisonRows(
          [{ id: "row", runnerVersion: version }],
          expected,
          decide,
        ),
      ).toThrow(TypeError);
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it("returns no decisions for no rows", () => {
    expect(decideComparisonRows([], version, () => "adopt")).toEqual([]);
  });
});
