import { describe, expect, it } from "vitest";
import { renderAdoptionReport } from "./adoption-report";
import type { ComparisonSnapshotFile } from "./snapshot";

const file: ComparisonSnapshotFile = {
  schemaVersion: 1,
  snapshots: [
    {
      id: "vllm-8b-fp16",
      engineVersion: "vllm 0.6.3",
      model: "llama-3.1-8b-instruct",
      fixtureVersion: "fixture-2026-08-01",
      runnerVersion: "runner-1.4.0",
      verdict: "adopted",
    },
    {
      id: "ollama-8b-q4",
      engineVersion: "ollama 0.4.7",
      model: "llama3.1:8b-instruct-q4_K_M",
      fixtureVersion: "fixture-2026-08-01",
      runnerVersion: "runner-1.3.2",
      verdict: "rejected",
      reasonCode: "runner-version-mismatch",
    },
  ],
};

describe("renderAdoptionReport", () => {
  const rendered = renderAdoptionReport(file);

  it("renders the title and the table header", () => {
    expect(rendered).toContain("# Local inference adoption");
    expect(rendered).toContain(
      "| ID | Engine version | Model | Fixture version | Runner version | 採否 | Reason |",
    );
  });

  it("renders the adopted row with the 採用 label and no reason", () => {
    expect(rendered).toContain(
      "| vllm-8b-fp16 | vllm 0.6.3 | llama-3.1-8b-instruct | " +
        "fixture-2026-08-01 | runner-1.4.0 | 採用 | — |",
    );
  });

  it("renders the rejected row with the 不採用 label and its reason", () => {
    expect(rendered).toContain(
      "| ollama-8b-q4 | ollama 0.4.7 | llama3.1:8b-instruct-q4_K_M | " +
        "fixture-2026-08-01 | runner-1.3.2 | 不採用 | runner-version-mismatch |",
    );
  });

  it("renders a safe reproduction command section for every row, sorted by id", () => {
    const ollamaIndex = rendered.indexOf("### ollama-8b-q4");
    const vllmIndex = rendered.indexOf("### vllm-8b-fp16");
    expect(ollamaIndex).toBeGreaterThan(-1);
    expect(vllmIndex).toBeGreaterThan(ollamaIndex);
    expect(rendered).toContain(
      "npm run local-inference -- --engine-version 'vllm 0.6.3' " +
        "--model 'llama-3.1-8b-instruct' --fixture-version 'fixture-2026-08-01' " +
        "--runner-version 'runner-1.4.0'",
    );
  });

  it("sorts table rows by id regardless of input order", () => {
    expect(rendered.indexOf("| ollama-8b-q4")).toBeLessThan(
      rendered.indexOf("| vllm-8b-fp16"),
    );
  });

  it("escapes a pipe and a newline in a text field", () => {
    const withPipe = renderAdoptionReport({
      schemaVersion: 1,
      snapshots: [
        {
          id: "weird|id",
          engineVersion: "engine\nversion",
          model: "model",
          fixtureVersion: "fixture",
          runnerVersion: "runner",
          verdict: "adopted",
        },
      ],
    });
    expect(withPipe).toContain("weird\\|id");
    expect(withPipe).toContain("engine version");
    expect(withPipe).not.toContain("engine\nversion |");
  });
});
