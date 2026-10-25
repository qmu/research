import { spawn } from "node:child_process";
import { open, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { resolve } from "node:path";

// macOS has no util-linux flock. Python uses the same BSD flock syscall on
// the inherited open file description, retained by Node after Python exits.
const macLock = `import fcntl, sys, time
end = time.monotonic() + (5 if sys.argv[1] == "wait" else 0)
while True:
    try:
        fcntl.flock(3, fcntl.LOCK_EX | fcntl.LOCK_NB)
        break
    except BlockingIOError:
        if time.monotonic() >= end:
            sys.exit(73)
        time.sleep(0.01)
`;

/** The OS lock belongs to Node's open file description, including after a crash. */
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
        process.platform === "darwin" ? "python3" : "flock",
        process.platform === "darwin"
          ? ["-c", macLock, wait ? "wait" : "now"]
          : [
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
          new Error("RUNNING-LOCK-UNAVAILABLE: flock backend is unavailable"),
        ),
      );
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                code === 73
                  ? "OUTPUT-RUNNING: another runner owns this output"
                  : "RUNNING-LOCK-UNAVAILABLE: flock backend is unavailable",
              ),
            ),
      );
    });
    return await action();
  } finally {
    await handle.close();
  }
}
