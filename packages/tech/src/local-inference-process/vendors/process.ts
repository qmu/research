import { execFile, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  parseProcessSnapshot,
  createProcessTreeSampler,
  type PeakRss,
  type ProcessRow,
} from "../domain/peak-rss.js";

export const SAMPLE_INTERVAL_MS = 50;
export const SNAPSHOT_TIMEOUT_MS = 1000;
type SnapshotFailure = "PS-TIMEOUT" | "PS-FAILED" | "INVALID-SAMPLE";
type Snapshot =
  | { rows: ProcessRow[]; reason?: never }
  | { rows?: never; reason: SnapshotFailure };

export type ProcessResult = {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  failed: boolean;
  peakRss: PeakRss;
  sampleCount: number;
  acquisitionReason: "RECORDED" | "NO-FIELD" | SnapshotFailure;
};

/** One bounded process-table read; arguments/environment/model text stay private. */
export function readProcessSnapshot(): Promise<Snapshot> {
  return new Promise((resolve) => {
    execFile(
      "/bin/ps",
      ["-axo", "pid=,ppid=,pgid=,rss=,stat=,lstart="],
      {
        encoding: "utf8",
        env: { ...process.env, LC_ALL: "C" },
        timeout: SNAPSHOT_TIMEOUT_MS,
        killSignal: "SIGKILL",
        maxBuffer: 4 * 1024 * 1024,
      },
      (error, stdout) => {
        if (error) {
          resolve({
            reason:
              error.killed && error.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
                ? "PS-TIMEOUT"
                : "PS-FAILED",
          });
          return;
        }
        const rows = parseProcessSnapshot(stdout);
        resolve(rows === null ? { reason: "INVALID-SAMPLE" } : { rows });
      },
    );
  });
}

function kill(pid: number) {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // A process can disappear after the snapshot and before the signal.
  }
}

/** Sample serially through root exit until its remaining observed tree is empty. */
export async function execute(
  file: string,
  args: string[],
  timeoutMs: number,
  readSnapshot: () => Promise<Snapshot> = readProcessSnapshot,
): Promise<ProcessResult> {
  const child = spawn(file, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, LC_ALL: "C" },
  });
  let failed = false;
  let timedOut = false;
  let exited = false;
  let exitCode: number | null = null;
  let signal: string | null = null;
  const closed = new Promise<void>((resolve) => {
    child.on("error", () => {
      failed = true;
    });
    child.on("close", (code, exitSignal) => {
      exited = true;
      exitCode = code;
      signal = exitSignal;
      resolve();
    });
  });
  const tree = createProcessTreeSampler(child.pid ?? -1);
  let acquisitionReason: ProcessResult["acquisitionReason"] = "NO-FIELD";
  const timer = setTimeout(() => {
    timedOut = true;
    if (child.pid) kill(-child.pid);
  }, timeoutMs);
  try {
    if (child.pid) {
      while (true) {
        // Await every ps before starting another; no interval callback can overlap.
        let snapshot: Snapshot;
        try {
          snapshot = await readSnapshot();
        } catch {
          snapshot = { reason: "PS-FAILED" };
        }
        if (snapshot.reason) {
          acquisitionReason = snapshot.reason;
          kill(-child.pid);
          // One bounded retry permits identity-checked cleanup of previously
          // observed descendants outside the group after a transient ps failure.
          try {
            const cleanup = await readSnapshot();
            if (cleanup.rows) {
              for (const member of tree.sample(cleanup.rows).members)
                kill(member.pid);
            }
          } catch {
            // Without a current snapshot, escaped PIDs cannot safely be signaled.
          }
          break;
        }
        const { members, valid } = tree.sample(snapshot.rows);
        if (!valid) acquisitionReason = "INVALID-SAMPLE";
        if (
          timedOut ||
          !valid ||
          (exited && (failed || exitCode !== 0 || signal))
        ) {
          kill(-child.pid);
          // Only signal identities confirmed in this snapshot, including observed
          // descendants that changed process group. Never signal a stale PID list.
          for (const member of members) kill(member.pid);
          break;
        }
        if (exited && members.length === 0) break;
        await delay(SAMPLE_INTERVAL_MS);
      }
    }
    await closed;
  } finally {
    clearTimeout(timer);
  }
  const measurementFailed = !["RECORDED", "NO-FIELD"].includes(
    acquisitionReason,
  );
  const peakRss: PeakRss = measurementFailed
    ? { value: null, unit: "MiB", reason: "MEASURE-FAILED" }
    : tree.reading();
  if (!measurementFailed)
    acquisitionReason = peakRss.value === null ? "NO-FIELD" : "RECORDED";
  return {
    exitCode,
    signal,
    timedOut,
    failed,
    peakRss,
    sampleCount: tree.sampleCount,
    acquisitionReason,
  };
}
