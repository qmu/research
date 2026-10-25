import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("creates pinned requests only for failed acquisition, without modifying evidence", () => {
  const dir = mkdtempSync(join(tmpdir(), "snapshot-recovery-"));
  const source = {
    runId: "snapshot-one",
    targetCommit: "1".repeat(40),
    runnerVersion: "local-inference/2",
  };
  const input = join(dir, "private-path.json");
  const cli = (args: string[], recover = true) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/prepare-local-inference-remeasurement.ts",
        ...(recover ? ["--request-on-failure"] : []),
        ...args,
      ],
      { encoding: "utf8" },
    );
  const args = [source.runId, source.targetCommit, source.runnerVersion, input];
  try {
    const cases = [
      [undefined, "SNAPSHOT-READ-FAILED"],
      ['{"private-marker":', "SNAPSHOT-JSON-INVALID"],
      [
        JSON.stringify({
          schemaVersion: 1,
          execution: {
            ...source,
            targetCommit: "2".repeat(40),
            runnerVersion: "local-inference/3",
          },
          runs: [{}],
          secret: "private-marker",
        }),
        "SNAPSHOT-IDENTITY-MISMATCH",
      ],
    ] as const;
    for (const [original, reason] of cases) {
      if (original !== undefined) writeFileSync(input, original);
      const result = cli(args);
      expect(result.status).toBe(2);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toEqual({
        kind: "remeasurement-request",
        schemaVersion: 1,
        reason,
        source,
        requiresNewExecutionId: true,
        requiresNewArtifact: true,
      });
      expect(result.stdout).not.toMatch(/private-marker|private-path/);
      const legacy = cli(args, false);
      expect(legacy.status).toBe(1);
      expect(legacy.stdout).toBe("");
      if (original !== undefined)
        expect(readFileSync(input, "utf8")).toBe(original);
    }
    // An invalid caller binding cannot be rescued from the saved artifact.
    for (const changed of [
      [source.runId, "main", source.runnerVersion, input],
      [source.runId, source.targetCommit, "latest", input],
      [...args, "extra"],
    ]) {
      const result = cli(changed);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toContain(dir);
    }
    const original = JSON.stringify({
      schemaVersion: 1,
      execution: source,
      runs: [{}],
    });
    writeFileSync(input, original);
    const success = cli(args);
    expect(success.status).toBe(0);
    expect(JSON.parse(success.stdout)).toEqual({
      source,
      requiresNewExecutionId: true,
    });
    expect(readFileSync(input, "utf8")).toBe(original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
