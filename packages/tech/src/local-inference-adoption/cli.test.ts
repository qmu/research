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

const fixtures = ["baseline", "other-host", "other-evaluator", "legacy"].map(
  (name) => resolve(`src/local-inference-adoption/fixtures/${name}.json`),
);
const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), "adoption-"));
  dirs.push(dir);
  return dir;
};
const cli = (...args: string[]) =>
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

  it("requires both output and input arguments", () => {
    expect(cli().status).toBe(1);
    expect(cli(join(temp(), "report.md")).status).toBe(1);
  });
});
