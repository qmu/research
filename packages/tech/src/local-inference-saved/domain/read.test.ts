import { describe, expect, it } from "vitest";
import { readSavedForAdoption } from "./read.js";

const current = {
  targetCommit: "a".repeat(40),
  runnerVersion: "runner-v3",
  runId: "execution-current",
};
const artifact = () => ({
  execution: { ...current, version: 3 },
  runs: [
    { engine: "strata", metrics: { tps: 99 }, quality: { pass: false } },
    { engine: "mlx", metrics: { tps: 12 }, quality: { pass: true } },
  ],
});

describe("saved measurement adoption read boundary", () => {
  it.each([
    ["targetCommit", "b".repeat(40), "COMMIT-MISMATCH"],
    ["runnerVersion", "runner-v2", "RUNNER-VERSION-MISMATCH"],
    ["runId", "execution-old", "RUN-ID-MISMATCH"],
  ] as const)("excludes all runs when %s differs", (field, value, reason) => {
    const stale = artifact();
    stale.execution[field] = value;
    const before = structuredClone(stale);
    const matching = artifact();
    const result = readSavedForAdoption([stale, matching], current);
    expect(result.eligible).toEqual([matching]);
    expect(result.excluded).toEqual([
      { sourceIndex: 0, reasons: [reason], evidence: before },
    ]);
    expect(stale).toEqual(before);
    expect(result.excluded[0].evidence).toBe(stale);
  });

  it("retains quality failures for the downstream quality gate", () => {
    const saved = artifact();
    const result = readSavedForAdoption([saved], current);
    expect(result.eligible[0]).toBe(saved);
    expect(result.eligible[0].runs[0].quality.pass).toBe(false);
    expect(result.excluded).toEqual([]);
  });

  it.each([undefined, null, [], {}, { targetCommit: " " }])(
    "fails closed on absent or malformed legacy execution %j",
    (execution) => {
      expect(readSavedForAdoption([{ execution }], current)).toMatchObject({
        eligible: [],
        excluded: [
          {
            reasons: [
              "MISSING-COMMIT",
              "MISSING-RUNNER-VERSION",
              "MISSING-RUN-ID",
            ],
          },
        ],
      });
    },
  );

  it("reports all mismatches in a fixed order without changing evidence", () => {
    const saved = {
      execution: { targetCommit: 4, runnerVersion: [], runId: 0 },
    };
    expect(readSavedForAdoption([saved], current).excluded[0]).toEqual({
      sourceIndex: 0,
      reasons: ["MISSING-COMMIT", "MISSING-RUNNER-VERSION", "MISSING-RUN-ID"],
      evidence: saved,
    });
  });

  it.each([
    { targetCommit: "a".repeat(7) },
    { targetCommit: "A".repeat(40) },
    { targetCommit: "g".repeat(40) },
    { targetCommit: "" },
    { runnerVersion: " " },
    { runId: "" },
  ])("rejects invalid current conditions %j", (override) => {
    expect(() => readSavedForAdoption([], { ...current, ...override })).toThrow(
      "INVALID-ADOPTION-IDENTITY",
    );
  });
});
