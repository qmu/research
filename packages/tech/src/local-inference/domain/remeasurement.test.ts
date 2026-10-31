import { describe, expect, it } from "vitest";
import {
  remeasurementRequest,
  type RecoverableResult,
  type RemeasurementBinding,
} from "./remeasurement.js";
import { engines } from "./result.js";

const targetCommit = "a".repeat(40);
const runnerVersion = "local-inference/test";
const binding: RemeasurementBinding = {
  execution: { runId: "execution-1", version: 1 },
  targetCommit,
  runnerVersion,
  fixtureSha256: "b".repeat(64),
  fixedTier: { label: "16 GiB", totalMiB: 16384 },
};

type Row = RecoverableResult["runs"][number];
function row(
  runId: string,
  purpose: Row["purpose"],
  ttft: number | null,
  rss: number | null,
): Row {
  return {
    runId,
    engine: engines[0],
    targetCommit,
    runnerVersion,
    purpose,
    metrics: { ttft: { value: ttft }, peak_rss: { value: rss } },
  };
}
function result(runs: Row[]): RecoverableResult {
  return {
    execution: { ...binding.execution, targetCommit, runnerVersion },
    fixtureSha256: binding.fixtureSha256,
    fixedTier: binding.fixedTier,
    runs,
  };
}

describe("remeasurementRequest warm-up rows", () => {
  it("returns null when only the warm-up row is missing metrics", () => {
    const input = result([
      row("warmup-1", "warmup", null, null),
      row("target-1", "adoption-target", 0.5, 100),
    ]);
    expect(remeasurementRequest(input, binding, "request-1")).toBeNull();
  });

  it("targets only adoption-target rows when both kinds are missing metrics", () => {
    const input = result([
      row("warmup-1", "warmup", null, null),
      row("target-1", "adoption-target", null, 100),
    ]);
    expect(remeasurementRequest(input, binding, "request-1")?.targets).toEqual([
      { runId: "target-1", engine: engines[0], missingMetrics: ["ttft"] },
    ]);
  });

  it("still rejects a warm-up row whose provenance differs", () => {
    const warmup = row("warmup-1", "warmup", null, null);
    warmup.targetCommit = "c".repeat(40);
    expect(() =>
      remeasurementRequest(result([warmup]), binding, "request-1"),
    ).toThrow("REMEASUREMENT-BINDING-MISMATCH");
  });

  it("does not treat a real zero as missing", () => {
    const input = result([row("target-1", "adoption-target", 0, 0)]);
    expect(remeasurementRequest(input, binding, "request-1")).toBeNull();
  });
});
