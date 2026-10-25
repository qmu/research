import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("preflights the complete snapshot before starting a renderer or touching output", () => {
  const dir = mkdtempSync(join(tmpdir(), "inference-duplicates-"));
  try {
    const input = join(dir, "saved.json");
    const second = join(dir, "second.json");
    const output = join(dir, "comparison.md");
    const marker = join(dir, "started");
    const renderer = join(dir, "renderer.cjs");
    writeFileSync(
      renderer,
      `const fs = require('node:fs');
fs.writeFileSync(process.argv[2], 'started');
let data = ''; process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => fs.writeFileSync(process.argv[3], data));`,
    );
    const row = {
      schemaVersion: 1,
      execution: { runId: "synthetic-run", version: 1 },
      runs: [{ engine: "strata" }],
    };
    const valid = JSON.stringify(row);
    writeFileSync(input, valid);
    writeFileSync(second, valid);
    const run = (
      paths = [input, second],
      command = [process.execPath, renderer, marker, output],
    ) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/preflight-local-inference.ts",
          ...paths,
          "--",
          ...command,
        ],
        { encoding: "utf8" },
      );
    for (const existing of [false, true]) {
      if (existing) writeFileSync(output, "existing comparison\n");
      const rejected = run();
      expect(rejected.status).toBe(1);
      expect(rejected.stdout).toBe("");
      expect(rejected.stderr).toBe("DUPLICATE-INFERENCE-ROW\n");
      expect(existsSync(marker)).toBe(false);
      if (existing)
        expect(readFileSync(output, "utf8")).toBe("existing comparison\n");
      else expect(existsSync(output)).toBe(false);
      expect(readFileSync(input, "utf8")).toBe(valid);
    }
    writeFileSync(second, '{"private-marker":');
    const invalid = run();
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toBe("INFERENCE-PREFLIGHT-FAILED\n");
    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(output, "utf8")).toBe("existing comparison\n");
    const accepted = run([input]);
    expect(accepted.status).toBe(0);
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual([row]);
    expect(readFileSync(input, "utf8")).toBe(valid);
    const failed = run([input], [process.execPath, "-e", "process.exit(7)"]);
    expect(failed.status).toBe(7);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it.each(
  [
    [],
    ["missing.json"],
    ["missing.json", "--"],
    ["missing.json", "--", "no-such-renderer"],
  ].map((args) => ({ args })),
)("rejects unusable arguments without leaking paths: %j", ({ args }) => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "src/entrypoints/preflight-local-inference.ts",
      ...args,
    ],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("INFERENCE-PREFLIGHT-FAILED\n");
});
