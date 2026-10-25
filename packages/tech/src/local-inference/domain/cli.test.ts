import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const runner = "src/entrypoints/render-local-inference.ts";
const fixture = "src/local-inference/fixtures/comparison.json";
const invoke = (args: string[]) =>
  execFileSync(process.execPath, ["--import", "tsx/esm", runner, ...args], {
    encoding: "utf8",
  });

describe("local inference CLI", () => {
  it("reproduces the committed result page from JSON", () => {
    expect(invoke([fixture])).toBe(
      readFileSync("../../docs/local-inference-comparison.md", "utf8"),
    );
  });
  it("writes a file and preserves existing output when validation fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "local-inference-"));
    try {
      const output = join(dir, "result.md");
      invoke([fixture, output]);
      expect(readFileSync(output, "utf8")).toBe(invoke([fixture]));
      const input = join(dir, "invalid.json");
      writeFileSync(input, '{"schemaVersion":2}');
      const result = spawnSync(process.execPath, [
        "--import",
        "tsx/esm",
        runner,
        input,
        output,
      ]);
      expect(result.status).not.toBe(0);
      expect(readFileSync(output, "utf8")).toBe(invoke([fixture]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
