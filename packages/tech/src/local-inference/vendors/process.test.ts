import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
        expect(result.cleanup).toBeNull();
        expect(result.failure).toEqual(
          exit === 0 ? null : { code: "MEASURE-FAILED" },
        );
        await expect(saveProcessMeasurement(path, options)).rejects.toThrow();
        expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
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
    expect(result.process).toEqual({ exit_code: null, signal: "SIGTERM" });
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

// Real descendants exercise the process-group boundary, not a mocked kill().
describe.skipIf(process.platform === "win32")("process-group cleanup", () => {
  it.each(engines)(
    "%s saves timeout and reaped group evidence",
    async (engine) => {
      const dir = await mkdtemp(join(tmpdir(), "group-timeout-"));
      try {
        const path = join(dir, "result.json");
        const result = await saveProcessMeasurement(path, {
          engine,
          command,
          args: [
            "-e",
            `
          const { spawn } = require('node:child_process');
          const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {stdio:'ignore'});
          process.on('SIGTERM', () => child.once('close', () => process.exit(0)));
          setInterval(()=>{},1000);
        `,
          ],
          timeoutMs: 500,
        });
        expect(result.failure).toEqual({ code: "TIMEOUT" });
        expect(result.status).toBe("failed");
        expect(result.cleanup).toEqual({
          scope: "process-group",
          term_sent: true,
          kill_sent: false,
          child_reaped: true,
          group_state: "gone",
        });
        expect(JSON.parse(await readFile(path, "utf8"))).toEqual(result);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it("escalates when the leader exits but a descendant ignores SIGTERM", async () => {
    const dir = await mkdtemp(join(tmpdir(), "group-escalation-"));
    const pidPath = join(dir, "pid");
    let pid: number | undefined;
    try {
      const result = await measureProcess({
        engine: "mlx",
        command,
        timeoutMs: 800,
        args: [
          "-e",
          `
          const { spawn } = require('node:child_process');
          const worker = ${JSON.stringify(`
            process.on('SIGTERM', () => {});
            require('node:fs').writeFileSync(process.argv[1], String(process.pid));
            setInterval(()=>{},1000);
          `)};
          spawn(process.execPath, ['-e', worker, process.argv[1]], {stdio:'ignore'});
          setInterval(()=>{},1000);
        `,
          pidPath,
        ],
      });
      pid = Number(await readFile(pidPath, "utf8"));
      expect(result.failure?.code).toBe("TIMEOUT");
      expect(result.cleanup).toMatchObject({
        term_sent: true,
        kill_sent: true,
        child_reaped: true,
      });
      expect(["gone", "remaining"]).toContain(result.cleanup?.group_state);
      // Containers may have a PID 1 that leaves orphan zombies unreaped. Such
      // a process is stopped, but the JSON must not claim its group is gone.
      try {
        process.kill(pid, 0);
        expect(process.platform).toBe("linux");
        const stat = await readFile(`/proc/${pid}/stat`, "utf8");
        expect(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[0]).toBe("Z");
        expect(result.cleanup?.group_state).toBe("remaining");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    } finally {
      if (pid) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* already gone */
        }
      }
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("forces an uncooperative leader to exit and reaps it", async () => {
    const result = await measureProcess({
      engine: "strata",
      command,
      timeoutMs: 500,
      args: ["-e", "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"],
    });
    expect(result.process.signal).toBe("SIGKILL");
    expect(result.cleanup).toEqual({
      scope: "process-group",
      term_sent: true,
      kill_sent: true,
      child_reaped: true,
      group_state: "gone",
    });
  });
});
