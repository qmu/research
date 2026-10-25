import { describe, expect, it } from "vitest";
import { renderMemoryAdoptionTable, type EngineMemoryRow } from "./table";
import type { MemoryUseCase, PeakMemoryReading } from "./types";

const strict: MemoryUseCase = {
  id: "strict",
  label: "Strict use case",
  hostRamPeakMiB: 8192,
  gpuVramPeakMiB: 8192,
  rationale: "test",
};

const loose: MemoryUseCase = {
  id: "loose",
  label: "Loose use case",
  hostRamPeakMiB: 65536,
  gpuVramPeakMiB: 49152,
  rationale: "test",
};

const useCases = [strict, loose];

const reading = (value: number): PeakMemoryReading => ({
  value,
  unit: "MiB",
});

describe("renderMemoryAdoptionTable", () => {
  it("renders an empty table with just the header for no rows", () => {
    expect(renderMemoryAdoptionTable([], useCases)).toBe(
      "| Engine | Host RAM peak | GPU VRAM peak | Strict use case | Loose use case |\n" +
        "| --- | --- | --- | --- | --- |",
    );
  });

  it("marks every use-case column adopt when both readings clear every ceiling", () => {
    const rows: EngineMemoryRow[] = [
      { engine: "mlx", hostRamPeak: reading(4096), gpuVramPeak: reading(4096) },
    ];
    expect(renderMemoryAdoptionTable(rows, useCases)).toContain(
      "| mlx | 4096.0 MiB | 4096.0 MiB | adopt | adopt |",
    );
  });

  it("rejects only the use case whose ceiling the reading exceeds", () => {
    const rows: EngineMemoryRow[] = [
      {
        engine: "strata",
        hostRamPeak: reading(46637.9),
        gpuVramPeak: reading(31785),
      },
    ];
    expect(renderMemoryAdoptionTable(rows, useCases)).toContain(
      "| strata | 46637.9 MiB | 31785.0 MiB | reject | adopt |",
    );
  });

  it("marks every use-case column undetermined and shows the reason code for a missing reading", () => {
    const rows: EngineMemoryRow[] = [
      {
        engine: "ollama",
        hostRamPeak: { value: null, unit: "MiB", reason: "NO-FIELD" },
        gpuVramPeak: { value: null, unit: "MiB", reason: "MEASURE-FAILED" },
      },
    ];
    expect(renderMemoryAdoptionTable(rows, useCases)).toContain(
      "| ollama | (NO-FIELD) | (MEASURE-FAILED) | undetermined | undetermined |",
    );
  });

  it("renders a measured zero as 0.0, distinct from a missing reading", () => {
    const rows: EngineMemoryRow[] = [
      { engine: "llama.cpp", hostRamPeak: reading(0), gpuVramPeak: reading(0) },
    ];
    expect(renderMemoryAdoptionTable(rows, useCases)).toContain(
      "| llama.cpp | 0.0 MiB | 0.0 MiB | adopt | adopt |",
    );
  });

  it("escapes a pipe and a newline in an engine name so rows cannot be forged", () => {
    const rows: EngineMemoryRow[] = [
      {
        engine: "weird | engine\nname",
        hostRamPeak: reading(1),
        gpuVramPeak: reading(1),
      },
    ];
    expect(renderMemoryAdoptionTable(rows, useCases)).toContain(
      "| weird \\| engine name | 1.0 MiB | 1.0 MiB | adopt | adopt |",
    );
  });

  it("keeps multiple rows in the order they were given, not sorted", () => {
    const row = (engine: string): EngineMemoryRow => ({
      engine,
      hostRamPeak: reading(1),
      gpuVramPeak: reading(1),
    });
    const table = renderMemoryAdoptionTable(
      [row("mlx"), row("llama.cpp")],
      useCases,
    );
    expect(table.indexOf("mlx")).toBeLessThan(table.indexOf("llama.cpp"));
  });
});
