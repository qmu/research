import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("downloads only a matching snapshot, with no failure body or source disclosure", () => {
  const dir = mkdtempSync(join(tmpdir(), "download-snapshot-"));
  const file = join(dir, "private-source.json");
  const commit = "a".repeat(40);
  const original =
    JSON.stringify(
      {
        execution: {
          runId: "run-1",
          targetCommit: commit,
          runnerVersion: "local-inference/4",
        },
        runs: [],
        evidence: "synthetic-private-marker",
      },
      null,
      2,
    ) + "\n";
  const invoke = (args: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/download-local-inference.ts",
        ...args,
      ],
      { encoding: "utf8" },
    );
  try {
    writeFileSync(file, original);
    const ok = invoke([file, "run-1", commit, "local-inference/4"]);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toBe(original);
    expect(ok.stderr).toBe("");
    for (const args of [
      [file, "run-2", commit, "local-inference/4"],
      [file, "run-1", "b".repeat(40), "local-inference/4"],
      [file, "run-1", commit, "local-inference/3"],
      [file, "run-1", commit, "local-inference/99"],
      [file],
      [file, "run-1", commit, "local-inference/4", "extra"],
      [join(dir, "missing"), "run-1", commit, "local-inference/4"],
    ]) {
      const result = invoke(args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("DOWNLOAD-SNAPSHOT-REJECTED\n");
    }
    expect(readFileSync(file, "utf8")).toBe(original);
    writeFileSync(file, "{synthetic-private-marker");
    const invalid = invoke([file, "run-1", commit, "local-inference/4"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
    expect(invalid.stderr).toBe("DOWNLOAD-SNAPSHOT-REJECTED\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
