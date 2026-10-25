import { spawnSync } from "node:child_process";
import {
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderAdoptionReport } from "./domain/adoption.js";

const currentCommit = "1".repeat(40);
const fixtures = [
  "baseline",
  "other-host",
  "other-evaluator",
  "legacy",
  "other-commit",
  "unknown-runner",
  "empty-runner",
].map((name) => resolve(`src/local-inference-adoption/fixtures/${name}.json`));
const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "adoption-"));
  dirs.push(dir);
  return dir;
};
const rawCli = (...args: string[]) =>
  spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "src/entrypoints/render-local-inference-adoption.ts",
      ...args,
    ],
    { encoding: "utf8" },
  );
const cli = (...args: string[]) => rawCli("--commit", currentCommit, ...args);
afterEach(() =>
  dirs
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

describe("condition-scoped adoption CLI", () => {
  it("reproduces the committed demo from enriched common JSON", () => {
    const output = join(temp(), "report.md");
    const result = cli(output, ...fixtures);
    expect(result.status).toBe(0);
    const expected = renderAdoptionReport(
      fixtures.map((path) => JSON.parse(readFileSync(path, "utf8"))),
      currentCommit,
    );
    expect(readFileSync(output, "utf8")).toBe(expected);
    expect(readFileSync("../../docs/local-inference-adoption.md", "utf8")).toBe(
      expected,
    );
  });

  it("refuses to replace source data, existing reports, and hard links", () => {
    const output = join(temp(), "existing.json");
    const original = readFileSync(fixtures[0], "utf8");
    writeFileSync(output, original);
    const alias = join(temp(), "alias.json");
    linkSync(output, alias);
    expect(cli(alias, output).status).toBe(1);
    expect(cli(output, output).status).toBe(1);
    expect(readFileSync(output, "utf8")).toBe(original);
  });

  it("validates every input before creating output and hides parser data", () => {
    const dir = temp();
    const invalid = join(dir, "private-input.json");
    const output = join(dir, "report.md");
    writeFileSync(invalid, '{"private-marker":broken}');
    const result = cli(output, fixtures[0], invalid);
    expect(result.status).toBe(1);
    expect(() => readFileSync(output)).toThrow();
    expect(result.stderr).not.toContain("private-marker");
    expect(result.stderr).not.toContain(dir);
  });

  it("requires an explicit valid comparison commit before writing output", () => {
    const output = join(temp(), "report.md");
    expect(rawCli(output, ...fixtures).status).toBe(1);
    expect(rawCli("--commit", "HEAD", output, ...fixtures).status).toBe(1);
    expect(
      rawCli("--commit", currentCommit.slice(0, 7), output, ...fixtures).status,
    ).toBe(1);
    expect(() => readFileSync(output)).toThrow();
    const staleOutput = join(temp(), "stale.md");
    expect(
      rawCli("--commit", "3".repeat(40), staleOutput, fixtures[0]).status,
    ).toBe(0);
    expect(readFileSync(staleOutput, "utf8")).toContain("COMMIT-MISMATCH");
    expect(readFileSync(staleOutput, "utf8")).not.toContain("| Adoption |");
  });

  it("requires both output and input arguments", () => {
    expect(cli().status).toBe(1);
    expect(cli(join(temp(), "report.md")).status).toBe(1);
  });
});

it("excludes unsupported saved runners through the CLI without rewriting evidence", () => {
  const dir = temp();
  const input = join(dir, "saved.json");
  const output = join(dir, "report.md");
  const saved = JSON.parse(readFileSync(fixtures[0], "utf8"));
  saved.execution.runnerVersion = "private-label-$(exit 1)";
  saved.runs[0].quality[0].verdict = "fail";
  const original = JSON.stringify(saved);
  writeFileSync(input, original);
  expect(cli(output, input).status).toBe(0);
  const rendered = readFileSync(output, "utf8");
  expect(rendered).toContain("UNKNOWN-RUNNER-VERSION");
  expect(rendered).toContain("#runner-version");
  expect(rendered).not.toContain("| Adoption |");
  expect(rendered).not.toContain("private-label");
  expect(readFileSync(input, "utf8")).toBe(original);
  expect(cli(output, input).status).toBe(1);
  expect(readFileSync(output, "utf8")).toBe(rendered);
});
