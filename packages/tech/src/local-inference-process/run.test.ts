import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalInferenceProcess } from "./run.js";
import { type ProcessResult } from "./vendors/process.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "inference-rss-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const successful: ProcessResult = {
  exitCode: 0,
  signal: null,
  timedOut: false,
  failed: false,
  peakRss: { value: 12288, unit: "MiB" },
  sampleCount: 10,
  acquisitionReason: "RECORDED",
};
const config = {
  engine: "mlx" as const,
  command: ["local-engine", "private-argument"],
};
const deps = (result = successful) => ({
  platform: "darwin",
  arch: "arm64",
  execute: vi.fn().mockResolvedValue(result),
});

describe("per-execution peak RSS artifact", () => {
  it.each(["ollama", "llama.cpp", "mlx", "strata"] as const)(
    "saves %s reading and acquisition metadata in one artifact",
    async (engine) => {
      const dependencies = deps();
      const output = join(directory, "run.json");
      const result = await runLocalInferenceProcess(
        { ...config, engine },
        output,
        dependencies,
      );
      expect(result.metrics.peak_rss).toEqual({ value: 12288, unit: "MiB" });
      expect(result.memoryMeasurement).toEqual({
        method: "ps-sampled-simultaneous-rss",
        scope: "local-inference-process-tree",
        aggregation: "maximum-sampled-sum",
        sampleIntervalMs: 50,
        snapshotTimeoutMs: 1000,
        sampleCount: 10,
        acquisitionReason: "RECORDED",
      });
      expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
      expect(await readFile(output, "utf8")).not.toContain("private-argument");
      expect(dependencies.execute).toHaveBeenCalledWith(
        config.command[0],
        config.command.slice(1),
        60000,
      );
      await expect(
        runLocalInferenceProcess(config, output, dependencies),
      ).rejects.toThrow();
      expect(dependencies.execute).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    ["linux", "arm64"],
    ["darwin", "x64"],
  ])("does not execute on unsupported %s/%s", async (platform, arch) => {
    const dependencies = { ...deps(), platform, arch };
    const result = await runLocalInferenceProcess(
      config,
      join(directory, "run.json"),
      dependencies,
    );
    expect(dependencies.execute).not.toHaveBeenCalled();
    expect(result.status).toBe("not-run");
    expect(result.metrics.peak_rss).toEqual({
      value: null,
      unit: "MiB",
      reason: "NOT-RUN",
    });
    expect(result.memoryMeasurement.acquisitionReason).toBe("UNSUPPORTED-HOST");
  });
  it.each([
    { ...successful, timedOut: true },
    { ...successful, failed: true },
    { ...successful, signal: "SIGKILL", exitCode: null },
    { ...successful, exitCode: 7 },
  ])(
    "does not use partial measurements from a failed process",
    async (execution) => {
      const result = await runLocalInferenceProcess(
        config,
        join(directory, "run.json"),
        deps(execution),
      );
      expect(result.status).toBe("failed");
      expect(result.metrics.peak_rss).toEqual({
        value: null,
        unit: "MiB",
        reason: "MEASURE-FAILED",
      });
    },
  );
  it("saves NO-FIELD when an otherwise successful run contains no reading", async () => {
    const result = await runLocalInferenceProcess(
      config,
      join(directory, "run.json"),
      deps({
        ...successful,
        peakRss: { value: null, unit: "MiB", reason: "NO-FIELD" },
        acquisitionReason: "NO-FIELD",
        sampleCount: 0,
      }),
    );
    expect(result.metrics.peak_rss).toEqual({
      value: null,
      unit: "MiB",
      reason: "NO-FIELD",
    });
  });
  it("saves a fixed reason instead of thrown diagnostics", async () => {
    const dependencies = deps();
    dependencies.execute.mockRejectedValue(new Error("private diagnostic"));
    const output = join(directory, "run.json");
    const result = await runLocalInferenceProcess(config, output, dependencies);
    expect(result.memoryMeasurement.acquisitionReason).toBe("PROCESS-FAILED");
    expect(await readFile(output, "utf8")).not.toContain("private diagnostic");
  });
  it("rejects invalid config before running or saving", async () => {
    const dependencies = deps();
    await expect(
      runLocalInferenceProcess(
        { ...config, command: [] },
        join(directory, "run.json"),
        dependencies,
      ),
    ).rejects.toThrow();
    expect(dependencies.execute).not.toHaveBeenCalled();
  });
});

it("persists unique run IDs alongside the measurement in each reserved artifact", async () => {
  const first = await runLocalInferenceProcess(
    config,
    join(directory, "first.json"),
    deps(),
  );
  const second = await runLocalInferenceProcess(
    config,
    join(directory, "second.json"),
    deps(),
  );
  expect(first.runId).toMatch(/^[a-f0-9-]{36}$/);
  expect(second.runId).not.toBe(first.runId);
  expect(
    JSON.parse(await readFile(join(directory, "first.json"), "utf8")).runId,
  ).toBe(first.runId);
  expect(first.schemaVersion).toBe(2);
});
it.each(["PS-TIMEOUT", "PS-FAILED", "INVALID-SAMPLE"] as const)(
  "preserves %s even when sampler cleanup kills the command",
  async (acquisitionReason) => {
    const result = await runLocalInferenceProcess(
      config,
      join(directory, "run.json"),
      deps({
        ...successful,
        exitCode: null,
        signal: "SIGKILL",
        acquisitionReason,
        peakRss: { value: null, unit: "MiB", reason: "MEASURE-FAILED" },
      }),
    );
    expect(result.status).toBe("failed");
    expect(result.metrics.peak_rss.value).toBeNull();
    expect(result.memoryMeasurement.acquisitionReason).toBe(acquisitionReason);
  },
);
