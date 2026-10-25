import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execute, readProcessSnapshot } from "./process.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "rss-executor-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});
const allocation = (mib: number) =>
  `globalThis.memory = Buffer.alloc(${mib} * 1024 * 1024, 1);`;
const spawnCode = (code: string, detached = false) =>
  `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(code)}], { stdio: 'ignore', detached: ${detached} }).unref();`;

describe("local process-tree execution", () => {
  it("reads a real headerless process snapshot", async () => {
    const snapshot = await readProcessSnapshot();
    expect(snapshot.reason).toBeUndefined();
    expect(snapshot.rows?.some((row) => row.pid === process.pid)).toBe(true);
  });
  it("returns nonzero status without capturing engine stdout or stderr", async () => {
    const result = await execute(
      process.execPath,
      [
        "-e",
        'console.log("private output"); console.error("private error"); process.exitCode = 7',
      ],
      5000,
    );
    expect(result).toMatchObject({
      exitCode: 7,
      signal: null,
      timedOut: false,
      failed: false,
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("sums simultaneously resident child and grandchild allocations", async () => {
    const grandchild = allocation(64) + "setTimeout(() => {}, 700);";
    const child =
      allocation(64) + spawnCode(grandchild) + "setTimeout(() => {}, 900);";
    const root =
      allocation(24) + spawnCode(child) + "setTimeout(() => {}, 1100);";
    const result = await execute(process.execPath, ["-e", root], 5000);
    expect(result).toMatchObject({
      exitCode: 0,
      timedOut: false,
      acquisitionReason: "RECORDED",
    });
    expect(result.peakRss.value).toBeGreaterThan(180);
    expect(result.sampleCount).toBeGreaterThan(2);
  });
  it("continues measuring after the original process exits", async () => {
    const child = allocation(64) + "setTimeout(() => {}, 450);";
    const start = Date.now();
    const result = await execute(
      process.execPath,
      ["-e", spawnCode(child)],
      5000,
    );
    expect(Date.now() - start).toBeGreaterThanOrEqual(400);
    expect(result.peakRss.value).toBeGreaterThan(64);
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });
  it("follows an observed descendant that creates its own session", async () => {
    const child = allocation(64) + "setTimeout(() => {}, 650);";
    const start = Date.now();
    const result = await execute(
      process.execPath,
      ["-e", spawnCode(child, true) + "setTimeout(() => {}, 350);"],
      5000,
    );
    expect(Date.now() - start).toBeGreaterThanOrEqual(600);
    expect(result.peakRss.value).toBeGreaterThan(64);
    expect(result.timedOut).toBe(false);
  });
  it("times out and kills descendants even after the original process exits", async () => {
    const pidFile = join(directory, "child.pid");
    const child = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);`;
    const result = await execute(
      process.execPath,
      ["-e", spawnCode(child)],
      500,
    );
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(0);
    const pid = Number(await readFile(pidFile, "utf8"));
    const snapshot = await readProcessSnapshot();
    expect(
      snapshot.rows?.filter(
        (row) => row.pid === pid && !row.state.startsWith("Z"),
      ),
    ).toEqual([]);
  });
  it("kills a still-running root at the execution deadline", async () => {
    const result = await execute(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      100,
    );
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe("SIGKILL");
  });
  it("uses a bounded cleanup retry to stop an observed escaped descendant after ps failure", async () => {
    const pidFile = join(directory, "escaped.pid");
    const child = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);`;
    let snapshots = 0;
    const result = await execute(
      process.execPath,
      ["-e", spawnCode(child, true) + "setInterval(() => {}, 1000);"],
      5000,
      async () => {
        if (++snapshots === 5) return { reason: "PS-FAILED" };
        return readProcessSnapshot();
      },
    );
    expect(result.acquisitionReason).toBe("PS-FAILED");
    expect(result.peakRss.value).toBeNull();
    expect(result.sampleCount).toBeGreaterThan(0);
    expect(snapshots).toBe(6);
    const pid = Number(await readFile(pidFile, "utf8"));
    const snapshot = await readProcessSnapshot();
    expect(
      snapshot.rows?.filter(
        (row) => row.pid === pid && !row.state.startsWith("Z"),
      ),
    ).toEqual([]);
  });
  it("normalizes spawn errors", async () => {
    expect(await execute(join(directory, "missing"), [], 5000)).toMatchObject({
      failed: true,
      exitCode: -2,
    });
  });
  it.each(["PS-FAILED", "PS-TIMEOUT", "INVALID-SAMPLE"] as const)(
    "stops on %s and discards partial samples",
    async (reason) => {
      const result = await execute(
        process.execPath,
        ["-e", "setInterval(() => {}, 1000)"],
        5000,
        async () => ({ reason }),
      );
      expect(result.acquisitionReason).toBe(reason);
      expect(result.peakRss).toEqual({
        value: null,
        unit: "MiB",
        reason: "MEASURE-FAILED",
      });
      expect(result.signal).toBe("SIGKILL");
    },
  );
  it("serializes delayed snapshots and leaves none in flight after completion", async () => {
    let inFlight = 0;
    let maximum = 0;
    const result = await execute(
      process.execPath,
      ["-e", "setTimeout(() => {}, 160)"],
      5000,
      async () => {
        maximum = Math.max(maximum, ++inFlight);
        await new Promise((resolve) => setTimeout(resolve, 80));
        const snapshot = await readProcessSnapshot();
        inFlight--;
        return snapshot;
      },
    );
    expect(result.exitCode).toBe(0);
    expect(maximum).toBe(1);
    expect(inFlight).toBe(0);
  });
});
