import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { readTargetCommit } from "./provenance.js";

it("resolves checkout HEAD even when the caller changes directory", () => {
  const expected = readTargetCommit();
  const cwd = process.cwd();
  try {
    process.chdir(tmpdir());
    expect(readTargetCommit()).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{40}$/);
  } finally {
    process.chdir(cwd);
  }
});

it("rejects a directory without Git metadata using a fixed safe error", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "provenance-"));
  try {
    expect(() => readTargetCommit(cwd)).toThrow(
      /^Cannot determine target commit$/,
    );
    execFileSync("git", ["init", "--quiet", cwd]);
    expect(() => readTargetCommit(cwd)).toThrow(
      /^Cannot determine target commit$/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
