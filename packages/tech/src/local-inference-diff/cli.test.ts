import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("CLI emits deterministic JSON and fails privately without partial stdout", () => {
  const dir = mkdtempSync(join(tmpdir(), "inference-diff-"));
  const args = [
    "--import",
    "tsx/esm",
    "src/entrypoints/diff-local-inference.ts",
  ];
  try {
    const input = JSON.stringify({
      schemaVersion: 1,
      inputSha256: "a".repeat(64),
      sampling: {},
      runs: [
        {
          engine: "mlx",
          model: "fixture",
          runtimeVersion: "1",
          condition: {},
          status: "measured",
          metrics: {},
        },
      ],
    });
    const path = join(dir, "private-input.json");
    writeFileSync(path, input);
    const run = () =>
      execFileSync(process.execPath, [...args, path, path], {
        encoding: "utf8",
      });
    expect(run()).toBe(run());
    expect(JSON.parse(run()).runs[0].quality.before).toBeNull();
    expect(readFileSync(path, "utf8")).toBe(input);
    for (const files of [
      [],
      [path],
      [path, path, path],
      [path, join(dir, "secret-missing")],
    ]) {
      const result = spawnSync(process.execPath, [...args, ...files], {
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toContain(dir);
    }
    writeFileSync(path, "secret malformed JSON");
    const result = spawnSync(process.execPath, [...args, path, path], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("secret");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
