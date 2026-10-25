import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const baseline =
  "src/local-inference-use-case-thresholds/fixtures/quality-baseline.json";
const current =
  "src/local-inference-use-case-thresholds/fixtures/quality-current.json";
const cli = [
  "--import",
  "tsx/esm",
  "src/entrypoints/render-local-inference-quality-adoption.ts",
];
const targetCommit = "1".repeat(40);
const dirs: string[] = [];
afterEach(() =>
  dirs
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);
function savedInput(
  change: (saved: {
    execution: { targetCommit?: unknown; runnerVersion?: unknown };
    runs: { quality: { verdict: string }[] }[];
  }) => void,
) {
  const saved = JSON.parse(readFileSync(current, "utf8"));
  change(saved);
  const original = JSON.stringify(saved);
  const dir = mkdtempSync(join(tmpdir(), "strata-adoption-"));
  dirs.push(dir);
  const path = join(dir, "current.json");
  writeFileSync(path, original);
  return { path, original };
}
const run = (...args: string[]) =>
  spawnSync(process.execPath, [...cli, ...args], { encoding: "utf8" });
describe("Strata provenance CLI", () => {
  it.each([
    ["", targetCommit, "MISSING-RUNNER-VERSION"],
    ["unknown-private-runner", targetCommit, "UNKNOWN-RUNNER-VERSION"],
    ["local-inference/4", "2".repeat(40), "COMMIT-MISMATCH"],
  ])(
    "excludes Strata runner %j at commit %s via the real CLI",
    (runnerVersion, commit, reason) => {
      const saved = savedInput((value) => {
        value.execution = { runnerVersion, targetCommit: commit };
      });
      const result = run(
        "--commit",
        targetCommit,
        baseline,
        saved.path,
        "interactive-coding-assistant",
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        "strata / synthetic-not-measured | undetermined",
      );
      expect(result.stdout).toContain(`excluded: ${reason}`);
      const renderedRow = result.stdout
        .split("\n")
        .find((line) => line.startsWith("| strata / synthetic-not-measured |"));
      expect(renderedRow).toBeDefined();
      expect(
        readFileSync("../../docs/local-inference-quality-adoption.md", "utf8"),
      ).toContain(renderedRow);
      // Evidence remains visible, but its failed fixture cannot become an eligible reject.
      expect(result.stdout).toContain("answer: regressed (pass → fail)");
      expect(result.stdout).not.toContain("unknown-private-runner");
      expect(readFileSync(saved.path, "utf8")).toBe(saved.original);
      expect(
        run(
          "--commit",
          targetCommit,
          baseline,
          saved.path,
          "interactive-coding-assistant",
        ).stdout,
      ).toBe(result.stdout);
    },
  );

  it("does not adopt a passing Strata result with a missing runner", () => {
    const saved = savedInput((value) => {
      delete value.execution.runnerVersion;
      for (const quality of value.runs[0].quality) quality.verdict = "pass";
    });
    const result = run("--commit", targetCommit, baseline, saved.path);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "strata / synthetic-not-measured | undetermined",
    );
    expect(result.stdout).toContain("MISSING-RUNNER-VERSION");
    expect(result.stdout).not.toContain(
      "| strata / synthetic-not-measured | adopt |",
    );
    expect(readFileSync(saved.path, "utf8")).toBe(saved.original);
  });

  it.each([
    [baseline, current],
    ["--commit", "HEAD", baseline, current],
    ["--commit", "1".repeat(7), baseline, current],
    ["--commit", "A".repeat(40), baseline, current],
    ["--commit", targetCommit, baseline, current, "unknown-case"],
    [
      "--commit",
      targetCommit,
      baseline,
      current,
      "interactive-coding-assistant",
      "extra",
    ],
  ])("requires explicit full target SHA and valid arguments: %j", (...args) => {
    const result = run(...args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--commit <full-target-sha>");
  });

  it("validates malformed provenance before printing any use case", () => {
    const saved = savedInput((value) => {
      value.execution.targetCommit = "private-invalid-commit";
    });
    const result = run("--commit", targetCommit, baseline, saved.path);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("private-invalid-commit");
    expect(result.stderr).not.toContain(saved.path);
    expect(readFileSync(saved.path, "utf8")).toBe(saved.original);
  });
});
