import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

export type Engine = "strata" | "ollama" | "llama.cpp" | "mlx";
export type CleanupResult = {
  scope: "process-group" | "child";
  term_sent: boolean;
  kill_sent: boolean;
  child_reaped: boolean;
  group_state: "gone" | "remaining" | "unknown" | "unsupported";
};

// A successful kill() only means the signal was sent, not that the group exited.
function groupState(pid: number): CleanupResult["group_state"] {
  try {
    process.kill(-pid, 0);
    return "remaining";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH"
      ? "gone"
      : "unknown";
  }
}

async function waitForGroup(
  pid: number,
): Promise<CleanupResult["group_state"]> {
  const deadline = performance.now() + 250;
  let state = groupState(pid);
  while (state === "remaining" && performance.now() < deadline) {
    await delay(10);
    state = groupState(pid);
  }
  return state;
}

export type ProcessResult = {
  schema_version: 1;
  engine: Engine;
  status: "ok" | "failed";
  process: { exit_code: number | null; signal: NodeJS.Signals | null };
  cleanup: CleanupResult | null;
  failure: {
    code: "TIMEOUT" | "CANCELLED" | "UNREACHABLE" | "MEASURE-FAILED";
  } | null;
};

/** Run one measurement command. Commands, environment and diagnostics stay private. */
export async function measureProcess(options: {
  engine: Engine;
  command: string;
  args?: string[];
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<ProcessResult> {
  if (
    !Number.isFinite(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 2_147_483_647
  )
    throw new Error("timeoutMs must be between 1 and 2147483647");
  const result = (
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    code: NonNullable<ProcessResult["failure"]>["code"] | null,
    cleanup: CleanupResult | null = null,
  ): ProcessResult => ({
    schema_version: 1,
    engine: options.engine,
    status: code === null ? "ok" : "failed",
    process: { exit_code: exitCode, signal },
    cleanup,
    failure: code === null ? null : { code },
  });
  if (options.signal?.aborted) return result(null, null, "CANCELLED");
  return new Promise((resolve) => {
    // No shell interpolation or captured output: neither secrets nor unbounded
    // model output can enter the artifact or fill a pipe.
    const child = spawn(options.command, options.args ?? [], {
      stdio: "ignore",
      detached: process.platform !== "win32",
    });
    let reason: "TIMEOUT" | "CANCELLED" | undefined;
    let spawnFailed = false;
    let cleanup: Promise<CleanupResult> | undefined;
    const stop = (code: "TIMEOUT" | "CANCELLED") => {
      if (reason) return;
      reason = code;
      cleanup = (async () => {
        const grouped = process.platform !== "win32";
        const evidence: CleanupResult = {
          scope: grouped ? "process-group" : "child",
          term_sent: false,
          kill_sent: false,
          child_reaped: false,
          group_state: grouped ? "unknown" : "unsupported",
        };
        const pid = child.pid;
        if (pid === undefined) return evidence;
        const send = (signal: NodeJS.Signals): boolean => {
          try {
            return grouped ? process.kill(-pid, signal) : child.kill(signal);
          } catch {
            return false;
          }
        };
        evidence.term_sent = send("SIGTERM");
        if (grouped) {
          evidence.group_state = await waitForGroup(pid);
          // The leader can close before descendants. Do not cancel escalation
          // on its close event: the entire owned process group must be checked.
          if (evidence.group_state !== "gone") {
            evidence.kill_sent = send("SIGKILL");
            evidence.group_state = await waitForGroup(pid);
          }
        } else {
          evidence.kill_sent = send("SIGKILL");
        }
        return evidence;
      })();
    };
    const cancel = () => stop("CANCELLED");
    const timer = setTimeout(() => stop("TIMEOUT"), options.timeoutMs);
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();
    child.on("error", () => {
      spawnFailed = true;
    });
    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      const evidence = cleanup ? await cleanup : null;
      if (evidence) evidence.child_reaped = child.pid !== undefined;
      resolve(
        result(
          spawnFailed ? null : code,
          signal,
          reason ??
            (spawnFailed
              ? "UNREACHABLE"
              : code === 0 && signal === null
                ? null
                : signal === "SIGINT"
                  ? "CANCELLED"
                  : "MEASURE-FAILED"),
          evidence,
        ),
      );
    });
  });
}

/** Exclusive creation protects previous evidence; failure rows are saved too. */
export async function saveProcessMeasurement(
  path: string,
  options: Parameters<typeof measureProcess>[0],
): Promise<ProcessResult> {
  const result = await measureProcess(options);
  await writeFile(path, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  return result;
}
