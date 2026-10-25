import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureProcess,
  saveProcessMeasurement,
  type Engine,
} from "./process.js";
import { beginExecution, completeExecution } from "./versioned-result.js";

const engines: Engine[] = ["strata", "ollama", "llama.cpp", "mlx"];
const command = process.execPath;
const timeoutMs = 5000;

describe.each(engines)("%s process evidence", (engine) => {
  it.each([0, 1, 137])(
    "persists the measured exit code and its execution id in one save",
    async (exit) => {
      const dir = await mkdtemp(join(tmpdir(), "measurement-"));
      try {
        const path = join(dir, "result.json");
        const options = {
          engine,
          command,
          args: ["-e", `process.exit(${exit})`],
          timeoutMs,
        };
        const result = await saveProcessMeasurement(path, options);
        expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result);
        expect(result.process).toEqual({ exit_code: exit, signal: null });
        expect(result.failure).toEqual(
          exit === 0 ? null : { code: "MEASURE-FAILED" },
        );
        expect(result.execution.version).toBe(1);
        expect(result.execution.runId).toMatch(/^[0-9a-f-]{36}$/);
        // A later measurement is a newer execution, so it may replace the first.
        const replacement = await saveProcessMeasurement(path, options);
        expect(replacement.execution.version).toBe(2);
        expect(replacement.execution.runId).not.toBe(result.execution.runId);
        expect(JSON.parse(await readFile(path, "utf8"))).toEqual(replacement);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("rejects completing a stale execution and keeps the saved evidence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "measurement-"));
    try {
      const path = join(dir, "result.json");
      const stale = await beginExecution(path);
      const current = await saveProcessMeasurement(path, {
        engine,
        command,
        args: ["-e", "process.exit(0)"],
        timeoutMs,
      });
      await expect(
        completeExecution(path, stale, {
          schema_version: 1 as const,
          engine,
          status: "ok" as const,
          process: { exit_code: 0, signal: null },
          failure: null,
        }),
      ).rejects.toThrow("STALE-EXECUTION");
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(current);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("records missing executable without diagnostics or command", async () => {
    const result = await measureProcess({
      engine,
      command: "/missing/private-token",
      timeoutMs,
    });
    expect(result.process.exit_code).toBeNull();
    expect(result.failure?.code).toBe("UNREACHABLE");
    expect(JSON.stringify(result)).not.toContain("private-token");
  });
  it("records deadline kill separately from an unexplained signal", async () => {
    const result = await measureProcess({
      engine,
      command,
      args: ["-e", "setInterval(()=>{},1000)"],
      timeoutMs: 100,
    });
    expect(result.process).toEqual({ exit_code: null, signal: "SIGKILL" });
    expect(result.failure?.code).toBe("TIMEOUT");
    const killed = await measureProcess({
      engine,
      command,
      args: ["-e", "process.kill(process.pid,'SIGKILL')"],
      timeoutMs,
    });
    expect(killed.failure?.code).toBe("MEASURE-FAILED");
  });
  it("records cancellation before launch and during execution", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      (
        await measureProcess({
          engine,
          command,
          timeoutMs,
          signal: controller.signal,
        })
      ).failure?.code,
    ).toBe("CANCELLED");
    const active = new AbortController();
    const pending = measureProcess({
      engine,
      command,
      args: ["-e", "setInterval(()=>{},1000)"],
      timeoutMs,
      signal: active.signal,
    });
    active.abort();
    expect((await pending).failure?.code).toBe("CANCELLED");
  });
});

it.each([0, -1, Infinity, NaN, 0.5, 2_147_483_648])(
  "rejects invalid deadline %s",
  async (timeoutMs) => {
    await expect(
      measureProcess({ engine: "mlx", command, timeoutMs }),
    ).rejects.toThrow("timeoutMs");
  },
);
