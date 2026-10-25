import { execFileSync } from "node:child_process";

/** Resolve the runner checkout, not the caller's cwd. Never persist Git errors
 * (which may contain local paths), branch names or environment values.
 * HEAD identifies committed code; it does not certify a clean working tree.
 */
export function readTargetCommit(
  cwd: string | URL = new URL(".", import.meta.url),
): string {
  try {
    const commit = execFileSync(
      "git",
      ["rev-parse", "--verify", "HEAD^{commit}"],
      {
        cwd,
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => !key.startsWith("GIT_"),
          ),
        ),
        timeout: 5_000,
        maxBuffer: 1024,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
    if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(commit)) return commit;
  } catch {
    // Fail closed before issuing any measurement request.
  }
  throw new Error("Cannot determine target commit");
}
