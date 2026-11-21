import { describe, expect, it } from "vitest";
import measured from "../vendors/fixtures/strata-ttft-warmup.json";
import { renderComparisonMarkdown } from "./comparison";
import { withRecordedStrataTtft } from "./recorded-ttft";

const gap = { value: null, unit: "s", reason: "NO-FIELD" };

function strataRun() {
  return {
    engine: "strata",
    model: "fixture-model-7b",
    runtimeVersion: "fixture-0.0.0",
    condition: { quantization: "Q4_K_M", context_length: 4096 },
    status: "measured",
    metrics: {
      ttft: gap,
      completion_tokens: { value: 128, unit: "tokens", source: "usage" },
      tps: { value: 30, unit: "tokens/s", source: "client" },
      startup_time: { value: null, unit: "s", reason: "NOT-RUN" },
      peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" },
    },
  };
}

function comparisonInput(runs: unknown[]) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-25T00:00:00.000Z",
    inputSha256: "a".repeat(64),
    procedure: "single-request-per-engine",
    runs,
  };
}

// Covers the glue between two independently built pieces: the recorder that
// patches a Strata run's metrics.ttft from a bench record (recorded-ttft.ts)
// and the comparison-page renderer that reads it (comparison.ts). A shape
// mismatch between them would otherwise surface only once both land on main.
describe("recorded Strata TTFT on the comparison page", () => {
  it.each([
    [measured, "2.689731 s"],
    [{ ...measured, first_answer_offset_s: undefined }, "欠測 (NO-FIELD)"],
    [{ ...measured, first_answer_offset_s: null }, "欠測 (MEASURE-FAILED)"],
  ])("renders the Strata TTFT cell for %#", (record, cellText) => {
    const input = comparisonInput([strataRun()]);
    const patched = withRecordedStrataTtft(input, record, 0);
    const markdown = renderComparisonMarkdown(patched);
    const row = markdown
      .split("\n")
      .find((line) => line.startsWith("| Strata"));
    expect(row).toContain(cellText);
  });

  it("names Strata in the missing-engines note when absent", () => {
    const input = comparisonInput([
      { ...strataRun(), engine: "ollama" },
      { ...strataRun(), engine: "llama.cpp" },
      { ...strataRun(), engine: "mlx" },
    ]);
    expect(renderComparisonMarkdown(input)).toContain(
      "No result was recorded for: Strata.",
    );
  });
});
