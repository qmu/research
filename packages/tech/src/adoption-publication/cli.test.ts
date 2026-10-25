import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const row = {
  engine: "strata",
  model: "model-a",
  fixture: "fixture-v1",
  runnerVersion: "v1",
  decision: "adopt",
};

it("publishes the entire valid JSON artifact, but no bytes for duplicate or invalid input", () => {
  const dir = mkdtempSync(join(tmpdir(), "adoption-publication-"));
  const path = join(dir, "input.json");
  try {
    for (const [input, reason] of [
      [JSON.stringify([row]), ""],
      [
        JSON.stringify([row, { ...row, decision: "reject" }]),
        "DUPLICATE-ADOPTION-ROW",
      ],
      [
        JSON.stringify([row, { secret: "never-log-this" }]),
        "INVALID-ADOPTION-IDENTITY",
      ],
      ["never-log-this", "INVALID-ADOPTION-IDENTITY"],
      ["{}", "INVALID-ADOPTION-IDENTITY"],
    ]) {
      writeFileSync(path, input);
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/publish-unique-adoption.ts",
          path,
        ],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(reason ? 1 : 0);
      expect(result.stderr).toBe(reason ? `${reason}\n` : "");
      if (reason) expect(result.stdout).toBe("");
      else expect(JSON.parse(result.stdout)).toEqual([row]);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
