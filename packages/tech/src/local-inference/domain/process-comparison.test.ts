import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  engines,
  parseProcessEvidence,
  renderProcessComparison,
} from "./process-comparison.js";

const saved = (
  engine = "strata",
  exit: number | null = 0,
  code: string | null = null,
  signal: string | null = null,
) => ({
  schema_version: 1,
  engine,
  status: code ? "failed" : "ok",
  process: { exit_code: exit, signal },
  failure: code ? { code } : null,
});

describe("saved process evidence adoption", () => {
  it.each(engines)("renders %s success without claiming adoption", (engine) => {
    const output = renderProcessComparison([
      JSON.parse(JSON.stringify(saved(engine))),
    ]);
    expect(output).toContain(
      `| ${engine} | 0 | none | none | Pending — speed, quality and memory evaluation required |`,
    );
  });
  it.each(["TIMEOUT", "CANCELLED", "UNREACHABLE", "MEASURE-FAILED"])(
    "holds %s even when exit is zero",
    (code) => {
      expect(renderProcessComparison([saved("strata", 0, code)])).toContain(
        `| 0 | none | ${code} | Hold — ${code} |`,
      );
    },
  );
  it.each([1, 137, null])(
    "preserves exit %s without diagnosing OOM",
    (exit) => {
      expect(
        renderProcessComparison([saved("strata", exit, "MEASURE-FAILED")]),
      ).toContain(
        `| ${exit ?? "not available"} | none | MEASURE-FAILED | Hold — MEASURE-FAILED |`,
      );
    },
  );
  it("preserves signal termination and null exit", () => {
    expect(
      renderProcessComparison([saved("mlx", null, "CANCELLED", "SIGINT")]),
    ).toContain(
      "| mlx | not available | SIGINT | CANCELLED | Hold — CANCELLED |",
    );
  });
  it("shows all missing engines in fixed order", () => {
    const lines = renderProcessComparison([])
      .split("\n")
      .filter((line) => line.includes("process evidence missing"));
    expect(lines.map((line) => line.split(" | ")[0])).toEqual(
      engines.map((engine) => `| ${engine}`),
    );
  });
  it("rejects duplicates rather than picking a run", () => {
    expect(() => renderProcessComparison([saved(), saved()])).toThrow(
      "Duplicate",
    );
  });
  it.each([
    null,
    {},
    { ...saved(), schema_version: 2 },
    { ...saved(), engine: "unknown" },
    { ...saved(), process: {} },
    saved("strata", 1),
    saved("strata", 0, null, "SIGTERM"),
    saved("strata", -1, "MEASURE-FAILED"),
    saved("strata", 1.5, "MEASURE-FAILED"),
    saved("strata", null, "OOM"),
    saved("strata", null, "TIMEOUT", "<script>"),
    { ...saved(), status: "failed" },
  ])("rejects malformed or inconsistent evidence %#", (value) => {
    expect(() => parseProcessEvidence(value)).toThrow(
      "Invalid saved process evidence",
    );
  });
  it("never renders extra diagnostics, commands or environment", () => {
    expect(
      renderProcessComparison([
        {
          ...saved(),
          command: "PRIVATE",
          stderr: "PRIVATE",
          environment: { token: "PRIVATE" },
        },
      ]),
    ).not.toContain("PRIVATE");
  });
  it("reads saved JSON through the CLI and fails safely on invalid input", () => {
    const dir = mkdtempSync(join(tmpdir(), "process-comparison-"));
    try {
      const path = join(dir, "result.json");
      writeFileSync(
        path,
        JSON.stringify(saved("ollama", 137, "MEASURE-FAILED")),
      );
      const args = [
        "--import",
        "tsx/esm",
        "src/entrypoints/render-local-process-comparison.ts",
        path,
      ];
      expect(
        execFileSync(process.execPath, args, { encoding: "utf8" }),
      ).toContain("| ollama | 137 | none | MEASURE-FAILED | Hold");
      writeFileSync(path, "PRIVATE invalid JSON");
      const result = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toContain("PRIVATE");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

it("keeps the documented example connected to saved fixture JSON", () => {
  const values = engines.map(
    (engine) =>
      JSON.parse(
        readFileSync(
          new URL(`./fixtures/${engine}.json`, import.meta.url),
          "utf8",
        ),
      ) as unknown,
  );
  const doc = readFileSync(
    new URL("../../../../../docs/local-inference-process.md", import.meta.url),
    "utf8",
  );
  expect(doc).toContain(renderProcessComparison(values));
});
