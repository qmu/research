import { describe, expect, it } from "vitest";
import { decideAdoption, renderAdoptionTable } from "./adoption";
import type { EngineAdoptionRow } from "./adoption";

const RUN_A = "repro-v1-aaaa";
const RUN_B = "repro-v1-bbbb";

function row(overrides: Partial<EngineAdoptionRow> = {}): EngineAdoptionRow {
  return {
    engine: "Ollama",
    speed: "42.0 tok/s",
    quality: "9/10 pass",
    rawTotalMiB: 16100,
    peak: { value: 10000, unit: "MiB" },
    speedRunId: RUN_A,
    qualityRunId: RUN_A,
    memoryRunId: RUN_A,
    ...overrides,
  };
}

describe("decideAdoption", () => {
  it("adopts a row whose speed, quality and memory cells share one runId", () => {
    expect(decideAdoption(row())).toEqual({ status: "adopted" });
  });

  it("rejects ORIGIN-MISMATCH when the memory cell came from a different run", () => {
    expect(decideAdoption(row({ memoryRunId: RUN_B }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISMATCH",
    });
  });

  it("rejects ORIGIN-MISMATCH when only the quality cell disagrees", () => {
    expect(decideAdoption(row({ qualityRunId: RUN_B }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISMATCH",
    });
  });

  it("rejects ORIGIN-MISSING when any runId is null", () => {
    expect(decideAdoption(row({ memoryRunId: null }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISSING",
    });
    expect(decideAdoption(row({ speedRunId: null }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISSING",
    });
    expect(decideAdoption(row({ qualityRunId: null }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISSING",
    });
  });

  it("rejects ORIGIN-MISSING when a runId is an empty string", () => {
    expect(decideAdoption(row({ memoryRunId: "" }))).toEqual({
      status: "rejected",
      reason: "ORIGIN-MISSING",
    });
  });

  it("prefers ORIGIN-MISSING over ORIGIN-MISMATCH when both conditions hold", () => {
    expect(
      decideAdoption(row({ memoryRunId: null, qualityRunId: RUN_B })),
    ).toEqual({ status: "rejected", reason: "ORIGIN-MISSING" });
  });
});

describe("renderAdoptionTable", () => {
  it("adopts a same-origin row and shows its margin", () => {
    const table = renderAdoptionTable([row()]);
    const lines = table.split("\n");
    expect(lines[0]).toBe(
      "| Engine | Speed | Quality | Memory margin | 採否 |",
    );
    expect(lines[2]).toContain("Ollama");
    expect(lines[2]).toContain("+6384.0 MiB margin (16 GiB)");
    expect(lines[2]).toContain("| 採用 |");
  });

  it("rejects a mixed-origin row but still shows the computed margin", () => {
    const table = renderAdoptionTable([row({ memoryRunId: RUN_B })]);
    const line = table.split("\n")[2];
    expect(line).toContain("+6384.0 MiB margin (16 GiB)");
    expect(line).toContain("不採用 (ORIGIN-MISMATCH)");
  });

  it("rejects a row with a missing origin", () => {
    const table = renderAdoptionTable([row({ speedRunId: null })]);
    expect(table.split("\n")[2]).toContain("不採用 (ORIGIN-MISSING)");
  });

  it("keeps caller row order and escapes cell text independently per row", () => {
    const rows = [
      row({ engine: "A|engine" }),
      row({ engine: "B", memoryRunId: RUN_B }),
    ];
    const lines = renderAdoptionTable(rows).split("\n");
    expect(lines[2]).toContain("A\\|engine");
    expect(lines[2]).toContain("採用");
    expect(lines[3]).toContain("B");
    expect(lines[3]).toContain("不採用 (ORIGIN-MISMATCH)");
  });
});
