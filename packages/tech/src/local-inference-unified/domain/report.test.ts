import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseUnifiedResult } from "./parse";
import { renderUnifiedMarkdown } from "./report";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/sample.json", import.meta.url), "utf8"),
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
      tps: { value: 20, unit: "tokens/s", source: "client" },
      startup_time: { value: null, unit: "s", reason: "NOT-RUN" },
      quality_score: { value: 0.9, unit: "score", source: "usage" },
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

describe("renderUnifiedMarkdown", () => {
  it("reproduces the committed result page from the fixture", () => {
    const page = readFileSync("../../docs/local-inference-unified.md", "utf8");
    expect(renderUnifiedMarkdown(parseUnifiedResult(fixture))).toBe(page);
  });

  it("always orders rows Ollama, llama.cpp, MLX, Strata", () => {
    const page = renderUnifiedMarkdown(parseUnifiedResult(fixture));
    const ollama = page.indexOf("| Ollama |");
    const llamaCpp = page.indexOf("| llama.cpp |");
    const mlx = page.indexOf("| MLX |");
    const strata = page.indexOf("| Strata |");
    expect(ollama).toBeGreaterThan(-1);
    expect(ollama).toBeLessThan(llamaCpp);
    expect(llamaCpp).toBeLessThan(mlx);
    expect(mlx).toBeLessThan(strata);
  });

  it("integrates speed, quality, memory and failure on one page", () => {
    const page = renderUnifiedMarkdown(parseUnifiedResult(fixture));
    expect(page).toContain("## All engines");
    expect(page).toContain("## Speed");
    expect(page).toContain("## Quality");
    expect(page).toContain("## Memory");
    expect(page).toContain("## Failure reasons");
  });

  it("shows every gap reason as missing text, never a blank or a zero", () => {
    const page = renderUnifiedMarkdown(parseUnifiedResult(fixture));
    expect(page).toContain("欠測 (NOT-RUN)");
    expect(page).toContain("欠測 (NO-FIELD)");
    expect(page).toContain("欠測 (MEASURE-FAILED)");
    expect(page).toContain("欠測 (UNSUPPORTED)");
    expect(page).not.toMatch(/\| 0 \|/);
  });

  it("lists only failed runs in the failure reasons section", () => {
    const page = renderUnifiedMarkdown(parseUnifiedResult(fixture));
    const section = page.split("## Failure reasons")[1];
    expect(section).toContain("| MLX | fixture-model-7b | NOT-LOADABLE |");
    expect(section).not.toContain("| Ollama |");
    expect(section).not.toContain("| Strata |");
  });

  it("reports no rejection when every run is measured", () => {
    const measuredOnly = result([
      run({ engine: "ollama" }),
      run({ engine: "llama.cpp" }),
      run({ engine: "mlx" }),
      run({ engine: "strata" }),
    ]);
    const page = renderUnifiedMarkdown(parseUnifiedResult(measuredOnly));
    expect(page).toContain("No run was rejected (不採用なし).");
  });

  it("notes any engine with no recorded run", () => {
    const threeEngines = result([
      run({ engine: "ollama" }),
      run({ engine: "mlx" }),
      run({ engine: "strata" }),
    ]);
    const page = renderUnifiedMarkdown(parseUnifiedResult(threeEngines));
    expect(page).toContain("No result was recorded for: llama.cpp.");
  });

  it("escapes Markdown table syntax in operator-supplied text", () => {
    const page = renderUnifiedMarkdown(
      parseUnifiedResult(result([run({ model: "a|b*c_d`e" })])),
    );
    expect(page).not.toContain("a|b*c_d`e");
    expect(page).toContain("a&#124;b&#42;c&#95;d&#96;e");
  });

  it("keeps an unsupported quality metric distinct from a failure", () => {
    const page = renderUnifiedMarkdown(
      parseUnifiedResult(
        result([
          run({
            metrics: {
              ...run().metrics,
              quality_score: {
                value: null,
                unit: "score",
                reason: "UNSUPPORTED",
              },
            },
          }),
        ]),
      ),
    );
    const qualitySection = page.split("## Quality")[1].split("## Memory")[0];
    expect(qualitySection).toContain("欠測 (UNSUPPORTED) — 未対応");
    const ollamaAllRow = page
      .split("\n")
      .find((line) => line.startsWith("| Ollama |"));
    expect(ollamaAllRow).toMatch(/\| — \|$/);
  });
});
