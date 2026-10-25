import type { PeakRss } from "../domain/peak-memory.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { arch, platform } from "node:os";

const execute = promisify(execFile);
/** RSS is KiB on macOS. Never sample the HTTP client as a server substitute. */
export function startPeakRss(
  pid?: number,
  dependencies = {
    supported: platform() === "darwin" && arch() === "arm64",
    readKiB: async (id: number) => {
      const { stdout } = await execute(
        "/bin/ps",
        ["-o", "rss=", "-p", String(id)],
        {
          timeout: 1000,
          maxBuffer: 4096,
        },
      );
      const text = stdout.trim();
      if (!/^\d+$/.test(text)) throw new Error("invalid RSS");
      return Number(text);
    },
  },
) {
  const intervalMs = 50;
  let value: number | null = null;
  let samples = 0;
  let failed = false;
  let stopped = false;
  const reason =
    pid === undefined
      ? "NO-PID"
      : !dependencies.supported
        ? "UNSUPPORTED-HOST"
        : null;
  async function sample() {
    try {
      if (pid === undefined) throw new Error("missing PID");
      const kib = await dependencies.readKiB(pid);
      if (!Number.isFinite(kib) || kib <= 0) throw new Error("invalid RSS");
      value = Math.max(value ?? 0, kib / 1024);
      samples++;
    } catch {
      failed = true;
    }
  }
  // Chain reads to avoid overlapping ps processes and await the last read on stop.
  let pending = reason ? Promise.resolve() : sample();
  const timer = reason
    ? undefined
    : setInterval(() => {
        pending = pending.then(() => (stopped ? undefined : sample()));
      }, intervalMs);
  return {
    async stop(): Promise<PeakRss> {
      stopped = true;
      clearInterval(timer);
      await pending;
      return {
        value: reason || failed ? null : value,
        unit: "MiB",
        source: "ps-rss-sampled",
        scope: "single-server-process",
        reason:
          reason ?? (failed || samples === 0 ? "SAMPLE-FAILED" : "SAMPLED"),
        samples,
        intervalMs,
      };
    },
  };
}
