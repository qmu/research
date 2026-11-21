import { describe, expect, it } from "vitest";
import measured from "./fixtures/strata-memory-summary.json";
import {
  renderMemoryComparisonTable,
  type MemoryComparisonRow,
} from "./memory-comparison-table";
import { normalizeStrataMemory } from "./strata-memory";

describe("renderMemoryComparisonTable", () => {
  it("renders an empty table with just the header for no rows", () => {
    expect(renderMemoryComparisonTable([])).toBe(
      "| Engine | Host RAM peak | GPU VRAM peak |\n| --- | --- | --- |",
    );
  });

  it("renders a measured row from a normalized reading, in caller order", () => {
    const { host_ram_peak, gpu_vram_peak } = normalizeStrataMemory(measured);
    const rows: MemoryComparisonRow[] = [
      {
        engine: "strata",
        hostRamPeak: host_ram_peak,
        gpuVramPeak: gpu_vram_peak,
      },
    ];
    expect(renderMemoryComparisonTable(rows)).toBe(
      "| Engine | Host RAM peak | GPU VRAM peak |\n" +
        "| --- | --- | --- |\n" +
        "| strata | 46637.9 MiB | 31785.0 MiB |",
    );
  });

  it("shows the reason code instead of a number for a missing or failed reading", () => {
    const rows: MemoryComparisonRow[] = [
      {
        engine: "ollama",
        hostRamPeak: { value: null, unit: "MiB", reason: "NO-FIELD" },
        gpuVramPeak: { value: null, unit: "MiB", reason: "MEASURE-FAILED" },
      },
    ];
    expect(renderMemoryComparisonTable(rows)).toContain(
      "| ollama | (NO-FIELD) | (MEASURE-FAILED) |",
    );
  });

  it("renders a measured zero as 0.0, distinct from a missing reading", () => {
    const rows: MemoryComparisonRow[] = [
      {
        engine: "mlx",
        hostRamPeak: { value: 0, unit: "MiB", source: "host-sampler" },
        gpuVramPeak: { value: 0, unit: "MiB", source: "host-sampler" },
      },
    ];
    expect(renderMemoryComparisonTable(rows)).toContain(
      "| mlx | 0.0 MiB | 0.0 MiB |",
    );
  });

  it("escapes a pipe and a newline in an engine name so rows cannot be forged", () => {
    const rows: MemoryComparisonRow[] = [
      {
        engine: "weird | engine\nname",
        hostRamPeak: { value: 1, unit: "MiB", source: "host-sampler" },
        gpuVramPeak: { value: 1, unit: "MiB", source: "host-sampler" },
      },
    ];
    expect(renderMemoryComparisonTable(rows)).toContain(
      "| weird \\| engine name | 1.0 MiB | 1.0 MiB |",
    );
  });

  it("keeps multiple rows in the order they were given, not sorted", () => {
    const row = (engine: string): MemoryComparisonRow => ({
      engine,
      hostRamPeak: { value: 1, unit: "MiB", source: "host-sampler" },
      gpuVramPeak: { value: 1, unit: "MiB", source: "host-sampler" },
    });
    const table = renderMemoryComparisonTable([row("mlx"), row("llama.cpp")]);
    expect(table.indexOf("mlx")).toBeLessThan(table.indexOf("llama.cpp"));
  });
});
