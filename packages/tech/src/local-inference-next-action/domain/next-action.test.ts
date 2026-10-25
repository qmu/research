import { describe, expect, it } from "vitest";
import { safeNextAction, type MissingMetric } from "./next-action.js";

const callUnknown = (input: unknown) => safeNextAction(input as MissingMetric);

describe("safeNextAction", () => {
  it.each([
    [
      "unsupported",
      "Check engine support",
      "This engine does not measure this metric. Read its documented capability notes before comparing it on this axis.",
    ],
    [
      "failed",
      "Check the saved failure evidence",
      "Measurement was attempted and failed. Read the saved failure evidence (exit code, truncated output) already recorded for this run.",
    ],
    [
      "not-recorded",
      "Check the recording backlog",
      "No measurement was recorded yet. Check whether this metric is scheduled for this engine before treating its absence as a result.",
    ],
  ] as const)(
    "returns a single safe, non-triggering action for reason %s",
    (reason, label, detail) => {
      expect(safeNextAction({ metric: "speed", reason })).toEqual({
        label,
        detail,
        anchor: reason,
      });
    },
  );

  it("returns the same action regardless of which metric is missing", () => {
    expect(safeNextAction({ metric: "speed", reason: "failed" })).toEqual(
      safeNextAction({ metric: "memory", reason: "failed" }),
    );
  });

  it("never renders a command, snapshot field, or re-run instruction", () => {
    for (const metric of ["speed", "quality", "memory"] as const) {
      for (const reason of ["unsupported", "failed", "not-recorded"] as const) {
        const action = safeNextAction({ metric, reason });
        expect(action.label + action.detail).not.toMatch(
          /npm run|reproduce|remeasure|re-run|rerun/i,
        );
      }
    }
  });

  it(
    "returns a fresh object each call; mutating one leaves the table intact",
    () => {
      const first = safeNextAction({ metric: "speed", reason: "failed" });
      first.label = "mutated";
      const second = safeNextAction({ metric: "speed", reason: "failed" });
      expect(second.label).toBe("Check the saved failure evidence");
    },
  );

  it.each([null, undefined, 1, "x", [], { metric: "speed" }])(
    "rejects malformed input %j",
    (input) => expect(() => callUnknown(input)).toThrow(TypeError),
  );

  it("rejects an unknown metric", () => {
    expect(() =>
      callUnknown({ metric: "latency", reason: "failed" }),
    ).toThrow(TypeError);
  });

  it("rejects an unknown reason, naming the metric", () => {
    expect(() =>
      callUnknown({ metric: "speed", reason: "timeout" }),
    ).toThrow("Invalid missing reason: speed");
  });
});
