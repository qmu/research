import { describe, expect, it } from "vitest";
import { renderMemoryMarginTable } from "./table";
import type { EngineMemoryMarginRow } from "./types";

describe("renderMemoryMarginTable", () => {
  it("renders speed, quality and margin side by side, in row order", () => {
    const rows: ReadonlyArray<EngineMemoryMarginRow> = [
      {
        engine: "Ollama",
        speed: "42.0 tok/s",
        quality: "9/10 pass",
        rawTotalMiB: 16100,
        peak: { value: 10000, unit: "MiB" },
      },
      {
        engine: "llama.cpp server",
        speed: "45.1 tok/s",
        quality: "9/10 pass",
        rawTotalMiB: 16100,
        peak: { value: 18000, unit: "MiB" },
      },
    ];
    const table = renderMemoryMarginTable(rows);
    const lines = table.split("\n");
    expect(lines[0]).toBe("| Engine | Speed | Quality | Memory margin |");
    expect(lines[2]).toContain("Ollama");
    expect(lines[2]).toContain("42.0 tok/s");
    expect(lines[2]).toContain("+6384.0 MiB margin (16 GiB)");
    expect(lines[3]).toContain("llama.cpp server");
    expect(lines[3]).toContain("insufficient — 1616.0 MiB over 16 GiB");
  });

  it("shows the reason code for a missing reading instead of a number", () => {
    const rows: ReadonlyArray<EngineMemoryMarginRow> = [
      {
        engine: "MLX",
        speed: "(NOT-RUN)",
        quality: "(NOT-RUN)",
        rawTotalMiB: 16100,
        peak: { value: null, unit: "MiB", reason: "NOT-RUN" },
      },
    ];
    const line = renderMemoryMarginTable(rows).split("\n")[2];
    expect(line).toContain("(NOT-RUN)");
  });

  it("shows NO-TIER when the raw capacity matches no known tier", () => {
    const rows: ReadonlyArray<EngineMemoryMarginRow> = [
      {
        engine: "Strata",
        speed: "n/a",
        quality: "n/a",
        rawTotalMiB: 40000,
        peak: { value: 10000, unit: "MiB" },
      },
    ];
    const line = renderMemoryMarginTable(rows).split("\n")[2];
    expect(line).toContain("(NO-TIER)");
  });

  it("escapes a pipe and a newline in an engine name so the table survives", () => {
    const rows: ReadonlyArray<EngineMemoryMarginRow> = [
      {
        engine: "weird|engine\nname",
        speed: "n/a",
        quality: "n/a",
        rawTotalMiB: 16100,
        peak: { value: 10000, unit: "MiB" },
      },
    ];
    const line = renderMemoryMarginTable(rows).split("\n")[2] ?? "";
    expect(line).toContain("weird\\|engine name");
    expect(line.split("\n").length).toBe(1);
  });

  it("accepts a caller-supplied tier list and tolerance", () => {
    const rows: ReadonlyArray<EngineMemoryMarginRow> = [
      {
        engine: "custom host",
        speed: "n/a",
        quality: "n/a",
        rawTotalMiB: 40000,
        peak: { value: 10000, unit: "MiB" },
      },
    ];
    const custom = [{ label: "40 GiB custom", totalMiB: 40000 }];
    const line = renderMemoryMarginTable(rows, custom).split("\n")[2];
    expect(line).toContain("30000.0 MiB margin (40 GiB custom)");
  });
});
