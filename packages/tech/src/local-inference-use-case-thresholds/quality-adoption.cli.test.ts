import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseline =
  "src/local-inference-use-case-thresholds/fixtures/quality-baseline.json";
const current =
  "src/local-inference-use-case-thresholds/fixtures/quality-current.json";
const cli = [
  "--import",
  "tsx/esm",
  "src/entrypoints/render-local-inference-quality-adoption.ts",
];
describe("quality adoption CLI", () => {
  it("reads saved common JSON without changing it and prints the regression beside reject", () => {
    const before = readFileSync(baseline, "utf8"),
      after = readFileSync(current, "utf8");
    const output = execFileSync(
      process.execPath,
      [...cli, baseline, current, "interactive-coding-assistant"],
      { encoding: "utf8" },
    );
    expect(output).toContain("strata / synthetic-not-measured | reject");
    expect(output).toContain("quality: pass (0.75 ratio)");
    expect(output).toContain("answer: regressed (pass → fail)");
    expect(output).not.toContain("Batch document");
    const page = readFileSync(
      "../../docs/local-inference-quality-adoption.md",
      "utf8",
    );
    expect(page).toContain(output.trim());
    expect(readFileSync(baseline, "utf8")).toBe(before);
    expect(readFileSync(current, "utf8")).toBe(after);
  });
  it("fails closed without printing paths or partial decisions", () => {
    const result = spawnSync(
      process.execPath,
      [...cli, "/missing/private-path", current],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("private-path");
  });
});
