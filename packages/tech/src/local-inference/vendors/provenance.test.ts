import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { readTargetCommit } from "./provenance.js";

const exec = promisify(execFile);
const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "provenance-"));
  directories.push(dir);
  return dir;
}
it.each(["sha1", "sha256"])(
  "captures full %s HEAD even when detached and ignores Git overrides",
  async (format) => {
    const dir = await directory();
    await exec("git", ["init", `--object-format=${format}`, dir]);
    await exec("git", [
      "-C",
      dir,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "fixture",
    ]);
    const { stdout } = await exec("git", ["-C", dir, "rev-parse", "HEAD"]);
    await exec("git", ["-C", dir, "checkout", "--detach", "HEAD"]);
    vi.stubEnv("GIT_DIR", "/nonexistent-private-marker");
    expect(await readTargetCommit(dir)).toBe(stdout.trim());
  },
);
it.each([false, true])(
  "refuses unavailable HEAD without exposing Git diagnostics (repository=%s)",
  async (initialize) => {
    const dir = await directory();
    if (initialize) await exec("git", ["init", dir]);
    expect(() => readTargetCommit(dir)).toThrow(
      /^Cannot determine target commit$/,
    );
  },
);

it("resolves checkout HEAD even when the caller changes directory", () => {
  const expected = readTargetCommit();
  const cwd = process.cwd();
  try {
    process.chdir(tmpdir());
    expect(readTargetCommit()).toBe(expected);
  } finally {
    process.chdir(cwd);
  }
});
