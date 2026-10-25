import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENGINE_OUTPUT_LIMITS,
  measureProcess,
  saveProcessMeasurement,
  type Engine,
} from "./process.js";

const engines: Engine[] = ["strata", "ollama", "llama.cpp", "mlx"];
const command = process.execPath;
const timeoutMs = 5000;

describe.each(engines)("%s bounded process output", (engine) => {
  it("drains both streams beyond engine defaults and saves the original exit atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bounded-output-"));
    try {
      const path = join(dir, "result.json");
      const limits = ENGINE_OUTPUT_LIMITS[engine];
      const result = await saveProcessMeasurement(path, {
        engine,
        command,
        args: [
          "-e",
          // Callbacks ensure all bytes reach the pipes before exit.
          `process.stdout.write(Buffer.alloc(${limits.stdoutBytes + 100000}, 65), () =>
            process.stderr.write(Buffer.alloc(${limits.stderrBytes + 100000}, 66), () =>
              process.exit(137)))`,
        ],
        timeoutMs,
      });
      expect(result.process).toEqual({ exit_code: 137, signal: null });
      expect(result.failure).toEqual({ code: "MEASURE-FAILED" });
      for (const [stream, limit, byte] of [
        ["stdout", limits.stdoutBytes, 65],
        ["stderr", limits.stderrBytes, 66],
      ] as const) {
        expect(result.output[stream]).toEqual({
          encoding: "base64",
          data: Buffer.alloc(limit, byte).toString("base64"),
          limit_bytes: limit,
          captured_bytes: limit,
          discarded_bytes: 100000,
          truncation_reason: "BYTE_LIMIT",
        });
      }
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result);
      expect(result.execution.version).toBe(1);
      expect((await readdir(dir)).sort()).toEqual([
        "result.json",
        "result.json.execution.json",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

it.each([0, 3, 4, 5])(
  "caps raw bytes at %i, including split UTF-8 and empty limits",
  async (limit) => {
    const bytes = Buffer.from("あb");
    const result = await measureProcess({
      engine: "mlx",
      command,
      args: ["-e", "process.stdout.write('あb');process.stderr.write('abc')"],
      timeoutMs,
      outputLimits: { stdoutBytes: limit, stderrBytes: 3 },
    });
    expect(Buffer.from(result.output.stdout.data, "base64")).toEqual(
      bytes.subarray(0, limit),
    );
    expect(result.output.stdout.captured_bytes).toBe(Math.min(limit, 4));
    expect(result.output.stdout.discarded_bytes).toBe(Math.max(4 - limit, 0));
    expect(result.output.stdout.truncation_reason).toBe(
      limit < 4 ? "BYTE_LIMIT" : null,
    );
    expect(result.output.stderr.truncation_reason).toBeNull();
    expect(result.process.exit_code).toBe(0);
    expect(result.status).toBe("ok");
  },
);

it("retains bounded output across timeout and keeps TIMEOUT distinct from truncation", async () => {
  const result = await measureProcess({
    engine: "mlx",
    command,
    args: ["-e", "process.stdout.write('abcd');setInterval(()=>{},1000)"],
    timeoutMs: 1000,
    outputLimits: { stdoutBytes: 2, stderrBytes: 0 },
  });
  expect(result.process).toEqual({ exit_code: null, signal: "SIGKILL" });
  expect(result.failure?.code).toBe("TIMEOUT");
  expect(result.output.stdout.truncation_reason).toBe("BYTE_LIMIT");
  expect(Buffer.from(result.output.stdout.data, "base64").toString()).toBe(
    "ab",
  );
  expect(result.output.stderr.captured_bytes).toBe(0);
});

it.each([-1, 0.5, NaN, Infinity, 16 * 1024 * 1024 + 1])(
  "rejects invalid output cap %s before launch",
  async (limit) => {
    await expect(
      measureProcess({
        engine: "mlx",
        command: "/missing",
        timeoutMs,
        outputLimits: { stdoutBytes: limit, stderrBytes: 1 },
      }),
    ).rejects.toThrow("output limits");
    await expect(
      measureProcess({
        engine: "mlx",
        command: "/missing",
        timeoutMs,
        outputLimits: { stdoutBytes: 1, stderrBytes: limit },
      }),
    ).rejects.toThrow("output limits");
  },
);
