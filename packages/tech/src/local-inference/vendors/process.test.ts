import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import {
  measureProcess,
  saveProcessMeasurement,
  type Engine,
} from "./process.js";

const engines: Engine[] = ["strata", "ollama", "llama.cpp", "mlx"];
const command = process.execPath;
const timeoutMs = 5000;

describe.each(engines)("%s process evidence", (engine) => {
  it.each([0, 1, 137])(
    "persists exit %i without guessing OOM",
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
        expect(result.execution).toEqual({
          runId: expect.any(String),
          version: 1,
        });
        // A later measurement of the same path reserves the next version and
        // publishes through the same atomic save, replacing the prior evidence.
        const replacement = await saveProcessMeasurement(path, options);
        expect(replacement.execution.version).toBe(2);
        expect(replacement.execution.runId).not.toBe(result.execution.runId);
        expect(JSON.parse(await readFile(path, "utf8"))).toEqual(replacement);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
  it("fences a stale measurement once a newer run reserves, even mid-process", async () => {
    const dir = await mkdtemp(join(tmpdir(), "measurement-"));
    try {
      const path = join(dir, "result.json");
      const gate = join(dir, "release");
      const slow = saveProcessMeasurement(path, {
        engine,
        command,
        args: [
          "-e",
          `const fs=require("fs");const deadline=Date.now()+${timeoutMs};` +
            `while(!fs.existsSync(${JSON.stringify(gate)})){if(Date.now()>deadline){process.exit(9)}}`,
        ],
        timeoutMs,
      });
      // Deterministic sync point: the sidecar only exists once `slow` has
      // reserved its execution, before the gate file unblocks its process.
      while (
        !(await readFile(`${path}.execution.json`, "utf8").catch(
          () => undefined,
        ))
      ) {
        await setTimeout(5);
      }
      const newer = await saveProcessMeasurement(path, {
        engine,
        command,
        args: ["-e", "process.exit(0)"],
        timeoutMs,
      });
      expect(newer.execution.version).toBe(2);
      const saved = await readFile(path, "utf8");
      await writeFile(gate, "");
      await expect(slow).rejects.toMatchObject({ code: "STALE-EXECUTION" });
      expect(await readFile(path, "utf8")).toBe(saved);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15000);
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
