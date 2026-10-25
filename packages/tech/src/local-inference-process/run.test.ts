import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runLocalInferenceProcess } from "./run.js";
import { execute, type ProcessResult } from "./vendors/process.js";

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
  stderr: " 12884901888 maximum resident set size\n",
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
        method: "darwin-time-l",
        scope: "local-inference-process",
        acquisitionReason: "RECORDED",
      });
      expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result);
      expect(await readFile(output, "utf8")).not.toContain("private-argument");
      expect(dependencies.execute).toHaveBeenCalledWith(
        "/usr/bin/time",
        [
          "-l",
          "/bin/sh",
          "-c",
          'exec "$@" 2>/dev/null',
          "inference",
          ...config.command,
        ],
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
      deps({ ...successful, stderr: "" }),
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

describe("process execution", () => {
  it("returns the real nonzero exit and keeps stdout out of diagnostics", async () => {
    const result = await execute(
      process.execPath,
      [
        "-e",
        'console.log("stdout"); console.error("stderr"); process.exitCode = 7',
      ],
      5000,
    );
    expect(result).toMatchObject({
      exitCode: 7,
      signal: null,
      timedOut: false,
      failed: false,
      stderr: "stderr\n",
    });
  });
  it("terminates a timed-out process group", async () => {
    const result = await execute(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      50,
    );
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe("SIGKILL");
  });
  it("normalizes spawn errors", async () => {
    expect(await execute(join(directory, "missing"), [], 5000)).toMatchObject({
      failed: true,
      exitCode: -2,
    });
  });
});
