import { expect, it } from "vitest";
import { readComparisonDiff, RUNNER_RECOVERY } from "./read";

export function fixture() {
  const metric = {
    before: { value: 10 },
    after: { value: 20 },
    changed: true,
    delta: 10,
    reason: null,
  };
  return {
    schemaVersion: 1,
    environment: {
      execution: {
        before: { runnerVersion: "local-inference/2" },
        after: { runnerVersion: "local-inference/2" },
        changed: false,
      },
    },
    runs: ["ollama", "llama.cpp", "mlx", "strata"].map((engine) => ({
      engine,
      model: "synthetic-model",
      presence: "both",
      comparable: true,
      speed: { tps: metric, ttft: metric },
      memory: { peak_rss: metric },
      quality: {
        before: [{ passed: true }],
        after: [{ passed: true }],
        changed: false,
      },
    })),
  };
}
it.each([undefined, null, "", " ", "\n\t"])(
  "rejects missing version %j on either side",
  (value) => {
    for (const side of ["before", "after"] as const) {
      const input = fixture();
      Object.assign(input.environment.execution[side], {
        runnerVersion: value,
      });
      const saved = JSON.stringify(input);
      const result = readComparisonDiff(input);
      for (const row of result.runs) {
        expect(row.comparable).toBe(false);
        expect(row.runnerFailure).toBe("MISSING-RUNNER-VERSION");
        expect(row.runnerRecovery).toEqual(RUNNER_RECOVERY);
        expect(row.speed.tps).toEqual({
          ...input.runs[0].speed.tps,
          delta: null,
          reason: "MISSING-RUNNER-VERSION",
        });
        expect(row.memory.peak_rss.delta).toBeNull();
        expect(row).toHaveProperty("quality", input.runs[0].quality);
      }
      expect(JSON.stringify(input)).toBe(saved);
      expect(readComparisonDiff(result)).toEqual(result);
    }
  },
);
it.each([
  {},
  { execution: null },
  { execution: {} },
  { execution: { before: null, after: null } },
])("rejects absent execution evidence %j", (environment) => {
  expect(
    readComparisonDiff({ ...fixture(), environment }).runs[0].runnerFailure,
  ).toBe("MISSING-RUNNER-VERSION");
});
it.each([
  0,
  {},
  [],
  "local-inference/999",
  " local-inference/2",
  "$(untrusted)",
])("rejects unknown version %j with static recovery", (runnerVersion) => {
  const input = fixture();
  Object.assign(input.environment.execution.before, { runnerVersion });
  const row = readComparisonDiff(input).runs[0];
  expect(row.runnerFailure).toBe("UNKNOWN-RUNNER-VERSION");
  expect(row.runnerRecovery).toEqual(RUNNER_RECOVERY);
  expect(row.speed.ttft.delta).toBeNull();
});
it("does not substitute runtime version or the other side's version", () => {
  const input = fixture();
  Object.assign(input.environment.execution.before, {
    runnerVersion: undefined,
    runtimeVersion: "local-inference/2",
  });
  expect(readComparisonDiff(input).runs[0].runnerFailure).toBe(
    "MISSING-RUNNER-VERSION",
  );
});
it("rejects differing supported versions even if upstream says comparable", () => {
  const input = fixture();
  input.environment.execution.after.runnerVersion = "local-inference/3";
  expect(readComparisonDiff(input).runs[0].runnerFailure).toBe(
    "RUNNER-VERSION-MISMATCH",
  );
});
it.each(["local-inference/2", "local-inference/3", "local-inference/4"])(
  "preserves valid deltas including zero for %s",
  (runnerVersion) => {
    const input = fixture();
    input.environment.execution.before.runnerVersion = runnerVersion;
    input.environment.execution.after.runnerVersion = runnerVersion;
    input.runs[0].speed.tps.delta = 0;
    const row = readComparisonDiff(input).runs[0];
    expect(row.comparable).toBe(true);
    expect(row.runnerFailure).toBeNull();
    expect(row.runnerRecovery).toBeNull();
    expect(row.speed.tps.delta).toBe(0);
  },
);
it("never upgrades incomparable, added or removed rows", () => {
  const input = fixture();
  input.runs[0].comparable = false;
  input.runs[1].presence = "added";
  input.runs[2].presence = "removed";
  for (const row of readComparisonDiff(input).runs.slice(0, 3)) {
    expect(row.comparable).toBe(false);
    expect(row.speed.tps.delta).toBeNull();
  }
});
it("rejects malformed and duplicate rows before returning a partial result", () => {
  const input = fixture();
  for (const invalid of [
    null,
    {},
    { ...input, schemaVersion: 2 },
    { ...input, runs: [] },
    { ...input, runs: [...input.runs, input.runs[0]] },
    { ...input, runs: [...input.runs, null] },
    {
      ...input,
      runs: [{ ...input.runs[0], speed: { tps: { delta: Infinity } } }],
    },
  ]) {
    expect(() => readComparisonDiff(invalid)).toThrow(
      "INVALID-COMPARISON-JSON",
    );
  }
});

it("prioritizes missing evidence and overwrites untrusted recovery metadata", () => {
  const input = fixture();
  Object.assign(input.environment.execution.before, { runnerVersion: null });
  input.environment.execution.after.runnerVersion = "untrusted-version";
  Object.assign(input.runs[0], {
    runnerFailure: null,
    runnerRecovery: { url: "https://invalid.example/unsafe" },
  });
  const row = readComparisonDiff(input).runs[0];
  expect(row.runnerFailure).toBe("MISSING-RUNNER-VERSION");
  expect(row.runnerRecovery).toEqual(RUNNER_RECOVERY);
});
