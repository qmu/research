import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import fixture from "./fixtures/missing-runner.json";

it("reads the saved diff, emits fixed failures with exit 2 and preserves input bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "diff-reader-"));
  const path = join(dir, "input.json");
  const invoke = (...args: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/read-local-inference-diff.ts",
        ...args,
      ],
      { encoding: "utf8" },
    );
  try {
    const bytes = JSON.stringify(fixture);
    writeFileSync(path, bytes);
    const result = invoke(path);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe("");
    const output = JSON.parse(result.stdout);
    expect(output.runs).toHaveLength(4);
    for (const row of output.runs) {
      expect(row.comparable).toBe(false);
      expect(row.runnerFailure).toBe("MISSING-RUNNER-VERSION");
      expect(row.speed.tps.delta).toBeNull();
    }
    expect(readFileSync(path, "utf8")).toBe(bytes);
    expect(invoke(path).stdout).toBe(result.stdout);
    const execution = { runnerVersion: "local-inference/2" };
    writeFileSync(
      path,
      JSON.stringify({
        ...fixture,
        environment: {
          execution: { before: execution, after: execution, changed: false },
        },
      }),
    );
    expect(invoke(path).status).toBe(0);
    for (const value of [
      "{untrusted-parser-excerpt",
      JSON.stringify({ ...fixture, runs: [...fixture.runs, null] }),
    ]) {
      writeFileSync(path, value);
      const invalid = invoke(path);
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe("");
      expect(invalid.stderr).toBe("INVALID-COMPARISON-JSON\n");
      expect(readFileSync(path, "utf8")).toBe(value);
    }
    for (const args of [[], [join(dir, "private-path")], [path, "extra"]]) {
      const invalid = invoke(...args);
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe("");
      expect(invalid.stderr).toBe("INVALID-COMPARISON-JSON\n");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
