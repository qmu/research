import { describe, expect, it } from "vitest";
import { renderLatencyMemoryScatterSection } from "./scatter-section.js";
import type { LatencyMemoryRun } from "./types.js";

describe("renderLatencyMemoryScatterSection", () => {
  it("reports that nothing can be drawn when no run is verified", () => {
    const runs: LatencyMemoryRun[] = [
      {
        engine: "ollama",
        label: "trial-1",
        reading: { status: "unverified", reason: "runner-version-mismatch" },
      },
    ];

    const section = renderLatencyMemoryScatterSection(runs);

    expect(section.verifiedCount).toBe(0);
    expect(section.excludedCount).toBe(1);
    expect(section.markdown).toBe(
      "**初回遅延×ピークRSS散布図**\n\n検証済みrunが無いため描画できない（1 件すべて未検証）。",
    );
  });

  it("plots only verified runs, grouped by engine, and discloses the excluded count", () => {
    const runs: LatencyMemoryRun[] = [
      {
        engine: "llama.cpp",
        label: "trial-1",
        reading: { status: "verified", initialDelayMs: 120, peakRssMiB: 900 },
      },
      {
        engine: "llama.cpp",
        label: "trial-2",
        reading: { status: "verified", initialDelayMs: 140, peakRssMiB: 950 },
      },
      {
        engine: "mlx",
        label: "trial-1",
        reading: { status: "verified", initialDelayMs: 80, peakRssMiB: 650 },
      },
      {
        engine: "strata",
        label: "trial-1",
        reading: { status: "unverified", reason: "NO-FIELD" },
      },
    ];

    const section = renderLatencyMemoryScatterSection(runs);

    expect(section.verifiedCount).toBe(3);
    expect(section.excludedCount).toBe(1);
    expect(section.markdown).toContain("<svg");
    expect(section.markdown).toContain("初回遅延×ピークRSS散布図");
    expect(section.markdown).toContain("検証済みrun 3 件を表示");
    expect(section.markdown).toContain("未検証のため 1 件を除外した");
    expect(section.markdown).toContain(
      "既存の速度・品質・メモリ余白の採否表とは独立した補助図であり、採否判定は変更しない。",
    );
    expect(section.markdown).toContain(">llama.cpp</text>");
    expect(section.markdown).toContain(">mlx</text>");
  });

  it("omits the excluded-count sentence when every run is verified", () => {
    const runs: LatencyMemoryRun[] = [
      {
        engine: "mlx",
        label: "trial-1",
        reading: { status: "verified", initialDelayMs: 80, peakRssMiB: 650 },
      },
    ];

    const section = renderLatencyMemoryScatterSection(runs);

    expect(section.excludedCount).toBe(0);
    expect(section.markdown).toContain("検証済みrun 1 件を表示。");
    expect(section.markdown).not.toContain("除外");
  });
});
