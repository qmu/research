import { describe, expect, it } from "vitest";
import type { ComparisonFile } from "./record";
import { renderComparisonPage, renderComparisonTable } from "./report";

const fingerprintOf = (seed: string): string =>
  `sha256:${seed.repeat(64).slice(0, 64)}`;

const comparisonFile: ComparisonFile = {
  schemaVersion: 1,
  fixture: true,
  runs: [
    {
      id: "llama-cpp-1",
      backend: "llama.cpp",
      modelCondition: {
        model: "llama-3.1-8b-instruct",
        quantization: "Q4_K_M",
        condition: "ctx=4096, temp=0.2, seed=7",
      },
      runner: { name: "llama.cpp server", version: "b3985" },
      commandFingerprint: fingerprintOf("a"),
    },
    {
      id: "ollama-1",
      backend: "ollama",
      modelCondition: {
        model: "llama-3.1-8b-instruct",
        quantization: "Q4_K_M",
        condition: "ctx=4096, temp=0.2, seed=7",
      },
      runner: { name: "ollama", version: "0.4.7" },
      commandFingerprint: fingerprintOf("b"),
    },
  ],
};

describe("renderComparisonTable", () => {
  it("renders a header-only table for no runs", () => {
    expect(renderComparisonTable({ ...comparisonFile, runs: [] })).toBe(
      "| Backend | Model condition | Runner | Command fingerprint |\n" +
        "| --- | --- | --- | --- |\n",
    );
  });

  it("renders one row per run, sorted by id", () => {
    const table = renderComparisonTable(comparisonFile);
    const lines = table.trim().split("\n");
    expect(lines).toHaveLength(4);
    // id "llama-cpp-1" sorts before "ollama-1"
    expect(lines[2]).toContain("llama.cpp");
    expect(lines[3]).toContain("ollama");
  });

  it("includes the model condition, runner, and command fingerprint for each row", () => {
    const table = renderComparisonTable(comparisonFile);
    expect(table).toContain(
      "llama-3.1-8b-instruct (Q4_K_M) — ctx=4096, temp=0.2, seed=7",
    );
    expect(table).toContain("ollama 0.4.7");
    expect(table).toContain(`\`${fingerprintOf("b")}\``);
  });

  it("escapes markdown table delimiters in text fields", () => {
    const withPipe: ComparisonFile = {
      ...comparisonFile,
      runs: [
        {
          ...comparisonFile.runs[0],
          modelCondition: {
            ...comparisonFile.runs[0].modelCondition,
            condition: "temp=0.2 | seed=7\nsecond line",
          },
        },
      ],
    };
    const table = renderComparisonTable(withPipe);
    expect(table).toContain("temp=0.2 \\| seed=7 second line");
    expect(table.trim().split("\n")).toHaveLength(3);
  });
});

describe("renderComparisonPage", () => {
  it("includes the title, an explanation of what is redacted, and the table", () => {
    const page = renderComparisonPage(comparisonFile);
    expect(page).toContain("# Local inference comparison");
    expect(page).toContain("redacted");
    expect(page).toContain(
      "| Backend | Model condition | Runner | Command fingerprint |",
    );
    expect(page).toContain(fingerprintOf("a"));
  });
});
