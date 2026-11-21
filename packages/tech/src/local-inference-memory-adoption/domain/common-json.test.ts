import { describe, expect, it } from "vitest";
import { renderCommonMemoryAdoptionTable } from "./common-json";
import { memoryUseCases } from "./catalog";

const metric = (value: unknown, unit = "MiB") => ({ value, unit });
const result = (metrics: unknown) => ({
  schemaVersion: 1,
  runs: [{ engine: "strata", metrics }],
});
const render = (input: unknown) =>
  renderCommonMemoryAdoptionTable(input, memoryUseCases);

describe("common JSON memory adoption", () => {
  it("connects JSON round-tripped peaks to explicit ceilings and decisions", () => {
    const input = result({
      host_ram_peak: metric(46637.9),
      gpu_vram_peak: metric(31785),
    });
    const before = JSON.stringify(input);
    const table = render(JSON.parse(before));
    expect(table).toContain("host ≤ 65536 MiB; GPU ≤ 49152 MiB");
    expect(table).toContain(
      "| strata | 46637.9 MiB | 31785.0 MiB | reject | adopt | reject |",
    );
    expect(JSON.stringify(input)).toBe(before);
  });
  it("does not substitute process RSS for absent machine peaks", () => {
    expect(render(result({ peak_rss: metric(0) }))).toContain(
      "(NO-FIELD) | (NO-FIELD) | undetermined",
    );
  });
  it("preserves failed and unmeasured reasons", () => {
    expect(
      render(
        result({
          host_ram_peak: { ...metric(null), reason: "MEASURE-FAILED" },
          gpu_vram_peak: { ...metric(null), reason: "NOT-RUN" },
        }),
      ),
    ).toContain("(MEASURE-FAILED) | (NOT-RUN) | undetermined");
  });
  it.each([-1, NaN, Infinity, "100", null])(
    "refuses invalid or unexplained peak %s",
    (value) => {
      expect(() => render(result({ host_ram_peak: metric(value) }))).toThrow();
    },
  );
  it("refuses incompatible units and envelope versions", () => {
    expect(() => render(result({ host_ram_peak: metric(1, "GiB") }))).toThrow(
      /MiB/,
    );
    expect(() => render({ schemaVersion: 2, runs: [] })).toThrow(
      /schemaVersion/,
    );
  });
  it("keeps zero distinct from missing and accepts the inclusive ceiling", () => {
    expect(
      render(result({ host_ram_peak: metric(8192), gpu_vram_peak: metric(0) })),
    ).toContain("8192.0 MiB | 0.0 MiB | adopt | adopt | adopt");
  });
});
