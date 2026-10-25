import { spawn } from "node:child_process";

export type ProcessResult = {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stderr: string;
  failed: boolean;
};

/** No shell interpolation; kill the process group on timeout, including time(1). */
export function execute(
  file: string,
  args: string[],
  timeoutMs: number,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(file, args, {
      detached: true,
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, LC_ALL: "C" },
    });
    let stderr = "";
    let failed = false;
    let timedOut = false;
    child.stderr.on("data", (chunk: Buffer) => {
      // Engine stderr is redirected away; keep only bounded time(1) diagnostics.
      if (stderr.length + chunk.length > 65536) failed = true;
      stderr = (stderr + chunk.toString()).slice(0, 65536);
    });
    child.on("error", () => {
      failed = true;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          // The child may have exited between timeout and kill.
        }
      }
    }, timeoutMs);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode, signal, timedOut, stderr, failed });
    });
  });
}
