import { describe, expect, it } from "vitest";
import {
  evaluateQualityAdoption,
  renderQualityAdoption,
} from "./quality-adoption.js";
import { useCaseById } from "./catalog.js";

const policy = useCaseById("interactive-coding-assistant");
const targetCommit = "1".repeat(40);
function input() {
  return {
    schemaVersion: 1,
    execution: { targetCommit, runnerVersion: "local-inference/4" },
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
  return evaluateQualityAdoption(before, after, policy, targetCommit)[0];
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
        evaluateQualityAdoption(before, after, policy, targetCommit).every(
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
    expect(() =>
      evaluateQualityAdoption({}, {}, policy, targetCommit),
    ).toThrow();
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

describe("Strata current runner and target commit eligibility", () => {
  it.each([
    [undefined, "MISSING-RUNNER-VERSION"],
    [null, "MISSING-RUNNER-VERSION"],
    ["", "MISSING-RUNNER-VERSION"],
    [" \n\t", "MISSING-RUNNER-VERSION"],
    ["local-inference/999", "UNKNOWN-RUNNER-VERSION"],
    [" local-inference/4", "UNKNOWN-RUNNER-VERSION"],
    ["local-inference/4 ", "UNKNOWN-RUNNER-VERSION"],
    [4, "UNKNOWN-RUNNER-VERSION"],
    [{}, "UNKNOWN-RUNNER-VERSION"],
    [[], "UNKNOWN-RUNNER-VERSION"],
  ])("excludes runner %j with the fixed reason %s", (version, reason) => {
    const after = input();
    Object.assign(after.execution, { runnerVersion: version });
    // Runtime labels and per-run fields must not substitute for saved provenance.
    Object.assign(after.runs[0], {
      runtimeVersion: "local-inference/4",
      runnerVersion: "local-inference/4",
    });
    const original = structuredClone(after);
    const result = row(input(), after);
    expect(result).toMatchObject({
      engine: "strata",
      decision: "undetermined",
      qualityDecision: "adopt",
      runnerVersion: null,
      targetCommit,
      excluded: true,
      exclusionReasons: [reason],
    });
    expect(result.rules.every((r) => r.outcome === "pass")).toBe(true);
    expect(result.fixtures.every((f) => f.after?.verdict === "pass")).toBe(
      true,
    );
    expect(renderQualityAdoption([result])).toContain(`excluded: ${reason}`);
    expect(after).toEqual(original);
  });

  it.each(["execution", "runnerVersion", "targetCommit"])(
    "excludes absent %s without inferring it from the baseline",
    (field) => {
      const after = input();
      Reflect.deleteProperty(
        field === "execution" ? after : after.execution,
        field,
      );
      const expected =
        field === "execution"
          ? ["MISSING-COMMIT", "MISSING-RUNNER-VERSION"]
          : [
              field === "runnerVersion"
                ? "MISSING-RUNNER-VERSION"
                : "MISSING-COMMIT",
            ];
      expect(row(input(), after)).toMatchObject({
        decision: "undetermined",
        excluded: true,
        exclusionReasons: expected,
      });
    },
  );

  it.each(["pass", "fail"])(
    "excludes a stale current commit even when recorded quality is %s",
    (verdict) => {
      const after = input();
      after.execution.targetCommit = "2".repeat(40);
      after.runs[0].quality[0].verdict = verdict;
      const result = row(input(), after);
      expect(result).toMatchObject({
        decision: "undetermined",
        excluded: true,
        exclusionReasons: ["COMMIT-MISMATCH"],
        runnerVersion: "local-inference/4",
        targetCommit: "2".repeat(40),
      });
      expect(result.fixtures[0].after?.verdict).toBe(verdict);
      expect(result.qualityDecision).toBe(
        verdict === "pass" ? "adopt" : "reject",
      );
    },
  );

  it("excludes every run before metric or quality rejection, in fixed reason order", () => {
    const after = input();
    after.execution.targetCommit = "2".repeat(40);
    after.execution.runnerVersion = "unknown";
    after.runs.push(structuredClone(after.runs[0]));
    after.runs[1].model = "second-model";
    after.runs[0].quality[0].verdict = "fail";
    after.runs[1].metrics.ttft.value = 20;
    const original = structuredClone(after);
    const rows = evaluateQualityAdoption(input(), after, policy, targetCommit);
    expect(rows).toHaveLength(2);
    for (const result of rows)
      expect(result).toMatchObject({
        decision: "undetermined",
        excluded: true,
        exclusionReasons: ["COMMIT-MISMATCH", "UNKNOWN-RUNNER-VERSION"],
      });
    expect(
      rows.find((result) => result.model === "synthetic-not-measured")
        ?.qualityDecision,
    ).toBe("reject");
    expect(
      rows
        .find((result) => result.model === "second-model")
        ?.rules.some((rule) => rule.outcome === "fail"),
    ).toBe(true);
    rows[0].exclusionReasons.push("changed");
    expect(rows[1].exclusionReasons).toEqual([
      "COMMIT-MISMATCH",
      "UNKNOWN-RUNNER-VERSION",
    ]);
    expect(after).toEqual(original);
  });

  it.each(["local-inference/2", "local-inference/3", "local-inference/4"])(
    "accepts the reviewed %s contract while retaining fixture rejection",
    (version) => {
      const after = input();
      after.execution.runnerVersion = version;
      expect(row(input(), after)).toMatchObject({
        decision: "adopt",
        excluded: false,
        exclusionReasons: [],
        runnerVersion: version,
      });
      after.runs[0].quality[0].verdict = "fail";
      expect(row(input(), after).decision).toBe("reject");
    },
  );

  it("checks the current artifact against the independent target, not the historical baseline", () => {
    const before = input();
    before.execution.targetCommit = "2".repeat(40);
    expect(row(before)).toMatchObject({ decision: "adopt", excluded: false });
  });

  it.each([
    undefined,
    null,
    "",
    "HEAD",
    "1".repeat(7),
    "z".repeat(40),
    "A".repeat(40),
  ])("rejects invalid required target %j", (commit) => {
    expect(() =>
      evaluateQualityAdoption(input(), input(), policy, commit as string),
    ).toThrow("Invalid target commit");
  });
  it.each([null, "", "HEAD", "1".repeat(7), {}, "<script>"])(
    "rejects malformed saved commit %j",
    (commit) => {
      const after = input();
      Object.assign(after.execution, { targetCommit: commit });
      expect(() => row(input(), after)).toThrow("Invalid saved commit");
    },
  );
  it.each([null, [], "private-value"])(
    "rejects malformed execution %j",
    (execution) => {
      const after = input();
      Object.assign(after, { execution });
      expect(() => row(input(), after)).toThrow("Invalid execution");
    },
  );
  it("does not reflect an unknown runner label into rows or markup", () => {
    const after = input();
    after.execution.runnerVersion = "<script>{{private}}|[link](https://bad)";
    const result = row(input(), after);
    expect(JSON.stringify(result)).not.toContain("private");
    const rendered = renderQualityAdoption([result]);
    expect(rendered).not.toContain("https://bad");
    expect(rendered).toContain("UNKNOWN-RUNNER-VERSION");
  });
});
