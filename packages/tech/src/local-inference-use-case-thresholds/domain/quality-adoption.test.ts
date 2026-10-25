import { describe, expect, it } from "vitest";
import {
  evaluateQualityAdoption,
  renderQualityAdoption,
} from "./quality-adoption.js";
import { useCaseById } from "./catalog.js";

const policy = useCaseById("interactive-coding-assistant");
function input() {
  return {
    schemaVersion: 1,
    inputSha256: "a".repeat(64),
    runs: [
      {
        engine: "strata",
        model: "synthetic-not-measured",
        status: "measured",
        metrics: {
          ttft: { value: 0.1, unit: "s" },
          tps: { value: 100, unit: "tokens/s" },
          peak_rss: { value: 1024, unit: "MiB" },
        },
        quality: ["answer", "format"].map((fixtureId) => ({
          fixtureId,
          fixtureSha256: "b".repeat(64),
          evaluatorVersion: "exact/v1",
          verdict: "pass",
          reason: null as string | null,
        })),
      },
    ],
  };
}
function row(before = input(), after = input()) {
  return evaluateQualityAdoption(before, after, policy)[0];
}

describe("saved fixture quality gates adoption", () => {
  it("adopts only comparable passing fixtures and passing metric thresholds", () => {
    expect(row().decision).toBe("adopt");
  });
  it("rejects a regression even with faster speed and an aggregate quality pass", () => {
    const before = input(),
      after = input();
    // 3/4 passes clear the policy's 0.75 ratio, but one regression still rejects.
    for (const value of [before, after])
      value.runs[0].quality.push(
        ...["extra1", "extra2"].map((fixtureId) => ({
          ...value.runs[0].quality[0],
          fixtureId,
        })),
      );
    after.runs[0].quality[0].verdict = "fail";
    const result = row(before, after);
    expect(result.rules.every((r) => r.outcome === "pass")).toBe(true);
    expect(result.decision).toBe("reject");
    expect(renderQualityAdoption([result])).toContain(
      "answer: regressed (pass → fail)",
    );
  });
  it("does not let one improvement cancel another regression", () => {
    const before = input(),
      after = input();
    before.runs[0].quality[1].verdict = "fail";
    after.runs[0].quality[0].verdict = "fail";
    expect(row(before, after).decision).toBe("reject");
  });
  it("permits an improvement when all current fixtures pass", () => {
    const before = input();
    before.runs[0].quality[0].verdict = "fail";
    expect(row(before).decision).toBe("adopt");
  });
  it("rejects an unchanged failing fixture", () => {
    const value = input();
    value.runs[0].quality[0].verdict = "fail";
    expect(row(value, value).decision).toBe("reject");
  });
  for (const change of [
    "input",
    "fixture",
    "evaluator",
    "added",
    "removed",
    "empty",
    "unknown",
    "model",
    "engine",
  ] as const) {
    it(`withholds adoption for ${change} evidence`, () => {
      const before = input(),
        after = input();
      if (change === "input") after.inputSha256 = "c".repeat(64);
      if (change === "fixture")
        after.runs[0].quality[0].fixtureSha256 = "c".repeat(64);
      if (change === "evaluator")
        after.runs[0].quality[0].evaluatorVersion = "exact/v2";
      if (change === "added") before.runs[0].quality.pop();
      if (change === "removed") after.runs[0].quality.pop();
      if (change === "empty") {
        before.runs[0].quality = [];
        after.runs[0].quality = [];
      }
      if (change === "unknown") {
        after.runs[0].quality[0].verdict = "undetermined";
        after.runs[0].quality[0].reason = "NOT-RUN";
      }
      if (change === "model") after.runs[0].model = "different-model";
      if (change === "engine") after.runs[0].engine = "mlx";
      expect(
        evaluateQualityAdoption(before, after, policy).every(
          (r) => r.decision === "undetermined",
        ),
      ).toBe(true);
    });
  }
  it.each(["failed", "not-run"])(
    "withholds adoption for %s runs despite stored metrics",
    (status) => {
      const after = input();
      after.runs[0].status = status;
      expect(row(input(), after).decision).toBe("undetermined");
    },
  );
  it("does not let passing quality override a speed failure", () => {
    const after = input();
    after.runs[0].metrics.ttft.value = 20;
    expect(row(input(), after).decision).toBe("reject");
  });
  it("rejects malformed or duplicate evidence", () => {
    const after = input();
    after.runs.push(after.runs[0]);
    expect(() => row(input(), after)).toThrow("Duplicate run");
    expect(() => evaluateQualityAdoption({}, {}, policy)).toThrow();
  });
  it("rejects incorrect metric units and nonfinite values", () => {
    const after = input();
    after.runs[0].metrics.ttft.unit = "ms";
    expect(() => row(input(), after)).toThrow("unit mismatch");
    after.runs[0].metrics.ttft.value = NaN;
    expect(() => row(input(), after)).toThrow("finite");
  });
  it("preserves input and renders deterministic escaped evidence", () => {
    const after = input();
    after.runs[0].quality[0].fixtureId = "<script>|test\n";
    const original = JSON.stringify(after);
    const first = renderQualityAdoption([row(input(), after)]);
    expect(first).toBe(renderQualityAdoption([row(input(), after)]));
    expect(first).toContain("&lt;script&gt;&#124;test ");
    expect(JSON.stringify(after)).toBe(original);
  });
});
