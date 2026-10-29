import { describe, expect, it } from "vitest";
import measured from "./fixtures/strata-memory-summary.json";
import { normalizeStrataMemory } from "./strata-memory";

const missing = { value: null, unit: "MiB", reason: "NO-FIELD" };
const failed = { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
const measuredGpuPeak = { value: 31785, unit: "MiB", source: "host-sampler" };

describe("normalizeStrataMemory", () => {
  it("replays the fixture's peaks with host-sampler provenance and JSON roundtrip", () => {
    const result = normalizeStrataMemory(measured);
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      host_ram_peak: {
        value: 45.54487228393555 * 1024,
        unit: "MiB",
        source: "host-sampler",
      },
      gpu_vram_peak: measuredGpuPeak,
    });
  });

  it("preserves a measured zero and keeps the two readings independent", () => {
    const input = { ...measured, gpu_peak_MiB: 0 };
    const result = normalizeStrataMemory(input);
    expect(result).toEqual({
      host_ram_peak: {
        value: 45.54487228393555 * 1024,
        unit: "MiB",
        source: "host-sampler",
      },
      gpu_vram_peak: { value: 0, unit: "MiB", source: "host-sampler" },
    });
  });

  it("keeps an absent field missing without failing the other reading", () => {
    const withoutRam: Record<string, unknown> = { ...measured };
    delete withoutRam.ram_peak_GiB;
    const result = normalizeStrataMemory(withoutRam);
    expect(result).toEqual({
      host_ram_peak: missing,
      gpu_vram_peak: measuredGpuPeak,
    });
  });

  it.each([undefined, null, [], "bad", 5])(
    "keeps an absent or malformed record as missing on both readings: %j",
    (record) => {
      const result = normalizeStrataMemory(record);
      expect(result).toEqual({
        host_ram_peak: missing,
        gpu_vram_peak: missing,
      });
    },
  );

  it.each([-1, NaN, Infinity, -Infinity, "45.5", true, {}, []])(
    "rejects an invalid reading without failing the other: %j",
    (value) => {
      const input = { ...measured, ram_peak_GiB: value };
      const result = normalizeStrataMemory(input);
      expect(result).toEqual({
        host_ram_peak: failed,
        gpu_vram_peak: measuredGpuPeak,
      });
    },
  );

  it("does not read swap or sampling metadata into either reading", () => {
    const input = {
      ram_peak_GiB: 1,
      gpu_peak_MiB: 2,
      swap_peak_MiB: 999999,
      samples: 0,
      sample_duration_s: -1,
    };
    const result = normalizeStrataMemory(input);
    expect(result).toEqual({
      host_ram_peak: { value: 1024, unit: "MiB", source: "host-sampler" },
      gpu_vram_peak: { value: 2, unit: "MiB", source: "host-sampler" },
    });
  });
});
