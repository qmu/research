import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const entry = "src/entrypoints/read-saved-local-inference.ts";
const commit = "a".repeat(40);
it("CLI separates stale files from current files without rewriting either", () => {
  const dir = mkdtempSync(join(tmpdir(), "adoption-read-"));
  try {
    const files = [join(dir, "old.json"), join(dir, "current.json")];
    const saved = ["old", "current"].map((runId) => ({
      execution: { targetCommit: commit, runnerVersion: "v1", runId },
      runs: [{ metrics: { tps: 4 }, quality: { pass: false } }],
    }));
    files.forEach((file, index) =>
      writeFileSync(file, JSON.stringify(saved[index])),
    );
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        ["--import", "tsx/esm", entry, commit, "v1", "current", ...files],
        { encoding: "utf8" },
      ),
    );
    expect(result.eligible).toEqual([saved[1]]);
    expect(result.excluded).toEqual([
      { sourceIndex: 0, reasons: ["RUN-ID-MISMATCH"], evidence: saved[0] },
    ]);
    // Re-read through the CLI with the previous identity: the old file is intact.
    const previous = JSON.parse(
      execFileSync(
        process.execPath,
        ["--import", "tsx/esm", entry, commit, "v1", "old", ...files],
        { encoding: "utf8" },
      ),
    );
    expect(previous.eligible).toEqual([saved[0]]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it.each([[], ["short", "v1", "current", "missing.json"]])(
  "CLI rejects missing or invalid conditions before output (%j)",
  (...args: string[]) => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx/esm", entry, ...args],
      {
        encoding: "utf8",
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("ENOENT");
  },
);
