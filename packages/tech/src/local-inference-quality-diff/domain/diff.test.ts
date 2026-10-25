import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { diffQuality } from "./diff.js";

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"),
  );
describe("saved quality judgment diff", () => {
  it("reports improvement and regression from fixtures without speed fields", () => {
    const output = diffQuality(fixture("before"), fixture("after"));
    expect(output.runs[0].fixtures.map((f) => f.change)).toEqual([
      "improved",
      "regressed",
    ]);
    expect(JSON.stringify(output)).not.toMatch(/ttft|tps|metrics/);
  });
  it("ignores judgment order and arbitrary evidence or timing metadata", () => {
    const a = fixture("before"),
      b = fixture("before");
    b.runs[0].quality.reverse();
    b.runs[0].text = "SECRET_SENTINEL";
    b.runs[0].quality[0].output = "SECRET_SENTINEL";
    b.runs[0].metrics = { ttft: 123 };
    expect(diffQuality(a, b)).toEqual(diffQuality(a, a));
  });
  it.each(["input", "fixture", "evaluator"])(
    "refuses attribution across changed %s",
    (field) => {
      const a = fixture("before"),
        b = fixture("after");
      if (field === "input") b.inputSha256 = "c".repeat(64);
      if (field === "fixture")
        b.runs[0].quality[0].fixtureSha256 = "c".repeat(64);
      if (field === "evaluator")
        b.runs[0].quality[0].evaluatorVersion = "exact-text/v2";
      expect(diffQuality(a, b).runs[0].fixtures[0].change).toBe("incomparable");
    },
  );
  it("retains undetermined reasons rather than treating missing output as failure", () => {
    const a = fixture("before"),
      b = fixture("after");
    Object.assign(b.runs[0].quality[0], {
      verdict: "undetermined",
      reason: "NO-OUTPUT",
    });
    const row = diffQuality(a, b).runs[0].fixtures[0];
    expect(row.change).toBe("undetermined");
    expect(row.after?.reason).toBe("NO-OUTPUT");
  });
  it("represents added/removed fixtures and missing legacy quality", () => {
    const a = fixture("before"),
      b = fixture("after");
    b.runs[0].quality.shift();
    expect(diffQuality(a, b).runs[0].fixtures[0].change).toBe("removed");
    expect(diffQuality(b, a).runs[0].fixtures[0].change).toBe("added");
    delete b.runs[0].quality;
    expect(
      diffQuality(b, a).runs[0].fixtures.every((f) => f.change === "added"),
    ).toBe(true);
  });
  it("handles added and removed runs", () => {
    const a = fixture("before"),
      b = fixture("after");
    b.runs[0].engine = "mlx";
    expect(diffQuality(a, b).runs.map((r) => r.fixtures[0].change)).toEqual([
      "added",
      "removed",
    ]);
  });
  it.each([
    "duplicate fixture",
    "duplicate run",
    "missing hash",
    "invalid verdict",
  ])("rejects %s", (kind) => {
    const a = fixture("before");
    if (kind === "duplicate fixture")
      a.runs[0].quality.push(a.runs[0].quality[0]);
    if (kind === "duplicate run") a.runs.push(a.runs[0]);
    if (kind === "missing hash") delete a.runs[0].quality[0].fixtureSha256;
    if (kind === "invalid verdict")
      a.runs[0].quality[0].verdict = "SECRET_SENTINEL";
    expect(() => diffQuality(a, a)).toThrow();
  });
  it("runs the fixture CLI with deterministic output", () => {
    const args = [
      "--import",
      "tsx/esm",
      "src/entrypoints/diff-local-inference-quality.ts",
      "src/local-inference-quality-diff/fixtures/before.json",
      "src/local-inference-quality-diff/fixtures/after.json",
    ];
    const output = execFileSync(process.execPath, args, { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual(
      diffQuality(fixture("before"), fixture("after")),
    );
    expect(execFileSync(process.execPath, args, { encoding: "utf8" })).toBe(
      output,
    );
  });
  it("fails without echoing paths or parser diagnostics", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/diff-local-inference-quality.ts",
        "SECRET_SENTINEL",
        "missing",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain("SECRET_SENTINEL");
  });
});
