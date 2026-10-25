import { expect, it } from "vitest";
import {
  comparisonPairGapReasons,
  type ComparisonMetricEvidence,
} from "../index";

const measured = {
  speed: { status: "measured", value: 0 },
  quality: { status: "measured", value: 1 },
  memory: { status: "measured", value: 1024 },
} as const;

it("orders by metric then baseline/candidate independent of property order", () => {
  expect(
    comparisonPairGapReasons({
      candidate: {
        memory: { status: "failed" },
        speed: { status: "unsupported" },
      },
      baseline: {},
    }),
  ).toEqual([
    { metric: "speed", side: "baseline", code: "not-recorded" },
    { metric: "speed", side: "candidate", code: "unsupported" },
    { metric: "quality", side: "baseline", code: "not-recorded" },
    { metric: "quality", side: "candidate", code: "not-recorded" },
    { metric: "memory", side: "baseline", code: "not-recorded" },
    { metric: "memory", side: "candidate", code: "failed" },
  ]);
});

it("does not fill a missing baseline from a measured candidate", () => {
  expect(
    comparisonPairGapReasons({ baseline: {}, candidate: measured }),
  ).toEqual(
    ["speed", "quality", "memory"].map((metric) => ({
      metric,
      side: "baseline",
      code: "not-recorded",
    })),
  );
});

it("accepts zero and complete measurements on both sides", () => {
  expect(
    comparisonPairGapReasons({ baseline: measured, candidate: measured }),
  ).toEqual([]);
});

it.each([NaN, Infinity, -Infinity, -1])(
  "identifies invalid candidate value %s",
  (value) => {
    expect(
      comparisonPairGapReasons({
        baseline: measured,
        candidate: { ...measured, quality: { status: "measured", value } },
      }),
    ).toEqual([
      { metric: "quality", side: "candidate", code: "invalid-value" },
    ]);
  },
);

it("rejects unknown status instead of returning partial reasons or raw errors", () => {
  expect(() =>
    comparisonPairGapReasons({
      baseline: {},
      candidate: {
        speed: { status: "private detail" },
      } as unknown as ComparisonMetricEvidence,
    }),
  ).toThrow("Unknown comparison metric evidence status");
});

it("does not mutate frozen inputs or expose extra diagnostic fields", () => {
  const baseline = Object.freeze({
    ...measured,
    speed: Object.freeze({
      status: "failed" as const,
      error: "private detail",
    }),
  });
  const pair = Object.freeze({ baseline, candidate: measured });
  const first = comparisonPairGapReasons(pair);
  expect(first).toEqual([
    { metric: "speed", side: "baseline", code: "failed" },
  ]);
  first.pop();
  expect(comparisonPairGapReasons(pair)).toHaveLength(1);
});
