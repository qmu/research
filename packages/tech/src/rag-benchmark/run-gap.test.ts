import { describe, expect, it, vi } from "vitest";
import { runRagBenchmark } from "./run";
import { renderRagBenchmarkReport } from "./domain/report";

vi.mock("./backends", async (importOriginal) => {
  const original = await importOriginal<typeof import("./backends")>();
  return {
    BACKENDS: [
      ...original.BACKENDS,
      {
        ...original.BACKENDS[0],
        id: "unsupported-test",
        name: "Unsupported test",
      },
    ],
  };
});

vi.mock("../vendors/vectorstore/sqlite-vec", () => ({
  createSqliteVecStore: () => {
    throw new Error("Synthetic measurement failure");
  },
}));

describe("RAG gap classification", () => {
  it("records and renders a backend with no adapter as unsupported", async () => {
    const result = await runRagBenchmark({
      fixture: false,
      k: 3,
      trials: 1,
      backends: ["unsupported-test"],
    });
    expect(result.runs[0]).toMatchObject({
      provenance: "error",
      reasonCode: "UNSUPPORTED",
      queryResults: [],
    });
    expect(renderRagBenchmarkReport(result)).toContain(
      "| unsupported | `UNSUPPORTED`",
    );
    expect(JSON.parse(JSON.stringify(result)).runs[0].reasonCode).toBe(
      "UNSUPPORTED",
    );
  });

  it("records and renders an adapter failure without measured numbers", async () => {
    const result = await runRagBenchmark({
      fixture: false,
      k: 3,
      trials: 1,
      backends: ["sqlite-vec"],
    });
    expect(result.runs[0]).toMatchObject({
      provenance: "error",
      reasonCode: "MEASURE-FAILED",
      error: "Error: Synthetic measurement failure",
      queryResults: [],
    });
    const report = renderRagBenchmarkReport(result);
    expect(report).toContain("| failed | `MEASURE-FAILED`");
    expect(report).toContain("**0 measured**");
  });
});
