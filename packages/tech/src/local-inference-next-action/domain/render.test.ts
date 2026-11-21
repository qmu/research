import { describe, expect, it } from "vitest";
import { renderMissingMetricNextActions } from "./render.js";
import type { MissingMetric } from "./next-action.js";

describe("renderMissingMetricNextActions", () => {
  it("returns an empty string for no missing metrics", () => {
    expect(renderMissingMetricNextActions([])).toBe("");
  });

  it(
    "renders one row per missing metric in speed, quality, memory order, regardless of input order",
    () => {
      const missing: MissingMetric[] = [
        { metric: "memory", reason: "not-recorded" },
        { metric: "speed", reason: "failed" },
        { metric: "quality", reason: "unsupported" },
      ];
      expect(renderMissingMetricNextActions(missing)).toBe(
        [
          "| Metric | Missing reason | Safe next action |",
          "| --- | --- | --- |",
          "| Speed | failed | [Check the saved failure evidence](#failed) — Measurement was attempted and failed. Read the saved failure evidence (exit code, truncated output) already recorded for this run. |",
          "| Quality | unsupported | [Check engine support](#unsupported) — This engine does not measure this metric. Read its documented capability notes before comparing it on this axis. |",
          "| Memory | not-recorded | [Check the recording backlog](#not-recorded) — No measurement was recorded yet. Check whether this metric is scheduled for this engine before treating its absence as a result. |",
        ].join("\n"),
      );
    },
  );

  it("renders only the missing metrics given, omitting measured ones", () => {
    const output = renderMissingMetricNextActions([
      { metric: "quality", reason: "failed" },
    ]);
    expect(output.split("\n")).toHaveLength(3);
    expect(output).toContain("| Quality | failed |");
    expect(output).not.toContain("Speed");
    expect(output).not.toContain("Memory");
  });

  it("re-renders the same input to the same byte-stable output", () => {
    const missing: MissingMetric[] = [
      { metric: "speed", reason: "unsupported" },
    ];
    expect(renderMissingMetricNextActions(missing)).toBe(
      renderMissingMetricNextActions(missing),
    );
  });

  it("does not mutate its input", () => {
    const missing: MissingMetric[] = [{ metric: "memory", reason: "failed" }];
    const before = structuredClone(missing);
    renderMissingMetricNextActions(missing);
    expect(missing).toEqual(before);
  });

  it("rejects a duplicated metric instead of silently keeping one", () => {
    expect(() =>
      renderMissingMetricNextActions([
        { metric: "speed", reason: "failed" },
        { metric: "speed", reason: "unsupported" },
      ]),
    ).toThrow(TypeError);
  });

  it("rejects an unknown reason", () => {
    const reason = "timeout" as unknown as MissingMetric["reason"];
    expect(() =>
      renderMissingMetricNextActions([{ metric: "speed", reason }]),
    ).toThrow(TypeError);
  });

  it(
    "never renders a reproduction command or remeasurement instruction",
    () => {
      const output = renderMissingMetricNextActions([
        { metric: "speed", reason: "failed" },
        { metric: "quality", reason: "unsupported" },
        { metric: "memory", reason: "not-recorded" },
      ]);
      expect(output).not.toMatch(/npm run|reproduce|remeasure|re-run|rerun/i);
    },
  );
});
