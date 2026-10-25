import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** Resolve the runner's checkout, never the caller's cwd or a Git env override.
 * Capture once before requests. Paths, remotes and Git diagnostics stay private.
 */
export async function captureCommit(
  directory = fileURLToPath(new URL(".", import.meta.url)),
): Promise<string> {
  try {
    const { stdout } = await exec(
      "git",
      ["-C", directory, "rev-parse", "--verify", "HEAD^{commit}"],
      {
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => !key.startsWith("GIT_"),
          ),
        ),
        timeout: 5_000,
        maxBuffer: 1024,
      },
    );
    const sha = stdout.trim();
    if (/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)) return sha;
  } catch {
    // Do not leak stderr, paths or environment through the error cause.
  }
  throw new Error("COMMIT-UNAVAILABLE: cannot identify runner checkout HEAD");
}
