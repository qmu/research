import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENGINES,
  FAILURE_CODES,
  GAP_REASONS,
  parseComparisonResult,
  renderComparisonMarkdown,
} from "./comparison";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/comparison-sample.json", import.meta.url),
    "utf8",
  ),
);

function run(overrides: Record<string, unknown> = {}) {
  return {
    engine: "ollama",
    model: "fixture-model",
    runtimeVersion: "0.0.0",
    condition: {},
    status: "measured",
    metrics: {
      ttft: { value: 0.1, unit: "s", source: "client" },
      completion_tokens: { value: 10, unit: "tokens", source: "usage" },
      tps: { value: 20, unit: "tokens/s", source: "client" },
      startup_time: { value: null, unit: "s", reason: "NOT-RUN" },
      peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" },
    },
    ...overrides,
  };
}

function result(runs: unknown[]) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-25T00:00:00.000Z",
    inputSha256: "a".repeat(64),
    procedure: "single-request-per-engine",
    runs,
  };
}

describe("parseComparisonResult", () => {
  it("parses the committed fixture", () => {
    const parsed = parseComparisonResult(fixture);
    expect(parsed.runs).toHaveLength(4);
    expect(parsed.runs.map((r) => r.engine).sort()).toEqual(
      [...ENGINES].sort(),
    );
  });

  it("rejects an unknown gap reason", () => {
    expect(() =>
      parseComparisonResult(
        result([
          run({
            metrics: {
              ...run().metrics,
              ttft: { value: null, unit: "s", reason: "SOMETHING-ELSE" },
            },
          }),
        ]),
      ),
    ).toThrow();
  });

  it("rejects an unknown failure code", () => {
    expect(() =>
      parseComparisonResult(
        result([run({ status: "failed", failure: { code: "WHO-KNOWS" } })]),
      ),
    ).toThrow();
  });

  it("requires a failure code on a failed run", () => {
    expect(() =>
      parseComparisonResult(result([run({ status: "failed" })])),
    ).toThrow();
  });

  it("rejects a failure code on a measured run", () => {
    expect(() =>
      parseComparisonResult(result([run({ failure: { code: "TIMEOUT" } })])),
    ).toThrow();
  });

  it("rejects an unknown engine", () => {
    expect(() =>
      parseComparisonResult(result([run({ engine: "gpt4all" })])),
    ).toThrow();
  });

  it("rejects a duplicate engine", () => {
    expect(() => parseComparisonResult(result([run(), run()]))).toThrow();
  });

  it("rejects a negative measurement", () => {
    expect(() =>
      parseComparisonResult(
        result([
          run({
            metrics: {
              ...run().metrics,
              tps: { value: -1, unit: "tokens/s", source: "client" },
            },
          }),
        ]),
      ),
    ).toThrow();
  });

  it("rejects schema versions other than 1", () => {
    expect(() =>
      parseComparisonResult({ ...result([run()]), schemaVersion: 2 }),
    ).toThrow();
  });

  it("rejects a malformed input digest", () => {
    expect(() =>
      parseComparisonResult({ ...result([run()]), inputSha256: "not-hex" }),
    ).toThrow();
  });

  it("rejects an empty runs array", () => {
    expect(() => parseComparisonResult(result([]))).toThrow();
  });
});

describe("renderComparisonMarkdown", () => {
  it("reproduces the committed result page from the fixture", () => {
    const page = readFileSync("../../docs/local-inference-gaps.md", "utf8");
    expect(renderComparisonMarkdown(fixture)).toBe(page);
  });

  it("always orders rows Ollama, llama.cpp, MLX, Strata", () => {
    const page = renderComparisonMarkdown(fixture);
    const ollama = page.indexOf("| Ollama |");
    const llamaCpp = page.indexOf("| llama.cpp |");
    const mlx = page.indexOf("| MLX |");
    const strata = page.indexOf("| Strata |");
    expect(ollama).toBeGreaterThan(-1);
    expect(ollama).toBeLessThan(llamaCpp);
    expect(llamaCpp).toBeLessThan(mlx);
    expect(mlx).toBeLessThan(strata);
  });

  it("shows every gap reason as missing text, never a blank or a zero", () => {
    const page = renderComparisonMarkdown(fixture);
    expect(page).toContain("欠測 (NOT-RUN)");
    expect(page).toContain("欠測 (NO-FIELD)");
    expect(page).toContain("欠測 (MEASURE-FAILED)");
    expect(page).not.toMatch(/\| 0 \|/);
  });

  it("shows the fixed failure code only for failed runs", () => {
    const page = renderComparisonMarkdown(fixture);
    expect(page).toContain("UNREACHABLE");
    expect(page).toContain("NOT-LOADABLE");
    const ollamaRow = page
      .split("\n")
      .find((line) => line.startsWith("| Ollama |"));
    expect(ollamaRow).toBeDefined();
    expect(ollamaRow).toMatch(/\| — \|$/);
  });

  it("notes any engine with no recorded run", () => {
    const threeEngines = result([
      run({ engine: "ollama" }),
      run({ engine: "mlx" }),
      run({ engine: "strata" }),
    ]);
    const page = renderComparisonMarkdown(threeEngines);
    expect(page).toContain("No result was recorded for: llama.cpp.");
  });

  it("escapes Markdown table syntax in operator-supplied text", () => {
    const page = renderComparisonMarkdown(
      result([run({ model: "a|b*c_d`e" })]),
    );
    expect(page).not.toContain("a|b*c_d`e");
    expect(page).toContain("a&#124;b&#42;c&#95;d&#96;e");
  });

  it("fails before any output is produced on invalid input", () => {
    expect(() => renderComparisonMarkdown({ schemaVersion: 2 })).toThrow();
  });
});

describe("fixed classification sets", () => {
  it("names exactly four gap reasons and eight failure codes", () => {
    expect(GAP_REASONS).toHaveLength(4);
    expect(FAILURE_CODES).toHaveLength(8);
    expect(new Set(GAP_REASONS).size).toBe(GAP_REASONS.length);
    expect(new Set(FAILURE_CODES).size).toBe(FAILURE_CODES.length);
  });
});
