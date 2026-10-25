import { spawn } from "node:child_process";
import { open, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { resolve } from "node:path";

/** util-linux flock locks the shared open file description owned by this process. */
export async function withRunningLock<T>(
  output: string,
  action: () => Promise<T>,
  wait = false,
): Promise<T> {
  const path = join(await realpath(dirname(resolve(output))), basename(output));
  // Never unlink: contenders must use the same inode, even after a crash.
  const handle = await open(`${path}.running.lock`, "a", 0o600);
  try {
    await new Promise<void>((resolve, reject) => {
      // fd 3 shares our open file description. flock exits after acquisition;
      // our descriptor retains the lock until close (including process death).
      const child = spawn(
        "flock",
        [
          "--exclusive",
          ...(wait ? ["--wait", "5"] : ["--nonblock"]),
          "--conflict-exit-code",
          "73",
          "3",
        ],
        { stdio: ["ignore", "ignore", "ignore", handle.fd] },
      );
      child.once("error", () =>
        reject(
          new Error("RUNNING-LOCK-UNAVAILABLE: util-linux flock is required"),
        ),
      );
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                code === 73
                  ? "OUTPUT-RUNNING: another runner owns this output"
                  : "RUNNING-LOCK-UNAVAILABLE: util-linux flock is required",
              ),
            ),
      );
    });
    return await action();
  } finally {
    await handle.close();
  }
}
