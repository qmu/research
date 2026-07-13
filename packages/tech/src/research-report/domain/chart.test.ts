import { describe, expect, it } from "vitest";
import { renderTimeSeriesChart } from "./chart.js";

describe("renderTimeSeriesChart", () => {
  it("renders a known two-point series with fixed coordinates, aria attributes, and an interval bar", () => {
    expect(
      renderTimeSeriesChart({
        id: "known-chart",
        title: "Known chart",
        description: "Two points with one interval.",
        xLabel: "Measured at",
        yLabel: "Score",
        valueDigits: 0,
        series: [
          {
            id: "a",
            label: "Alpha",
            points: [
              {
                measuredAt: "2026-01-01T00:00:00.000Z",
                value: 10,
                interval: { lower: 8, upper: 12 },
              },
              { measuredAt: "2026-01-02T00:00:00.000Z", value: 20 },
            ],
          },
        ],
      }),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="known-chart-title known-chart-desc" viewBox="0 0 640 320"><title id="known-chart-title">Known chart</title><desc id="known-chart-desc">Two points with one interval.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-01-01</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-01-02</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Score</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">20</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">8</text><g><path d="M 64.00 218.67 L 616.00 32.00" fill="none" stroke="#1f77b4" stroke-width="2"/><g stroke="#1f77b4" stroke-width="1.5"><line x1="64.00" y1="181.33" x2="64.00" y2="256.00"/><line x1="60.00" y1="181.33" x2="68.00" y2="181.33"/><line x1="60.00" y1="256.00" x2="68.00" y2="256.00"/></g><circle cx="64.00" cy="218.67" r="3.5" fill="#1f77b4"><title>Alpha 2026-01-01 10</title></circle><circle cx="616.00" cy="32.00" r="3.5" fill="#1f77b4"><title>Alpha 2026-01-02 20</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">Alpha</text></g></svg>',
    );
  });

  it("renders a single measured date as one point with the deterministic annotation and no trend line", () => {
    const svg = renderTimeSeriesChart({
      id: "single-chart",
      title: "Single chart",
      description: "One measured point.",
      xLabel: "Measured at",
      yLabel: "Latency",
      valueDigits: 1,
      series: [
        {
          id: "one",
          label: "Only",
          points: [{ measuredAt: "2026-01-01T00:00:00.000Z", value: 5 }],
        },
      ],
    });

    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="single-chart-title single-chart-desc" viewBox="0 0 640 320"><title id="single-chart-title">Single chart</title><desc id="single-chart-desc">One measured point.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-01-01</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-01-01</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Latency</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">6.0</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">4.0</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><circle cx="340.00" cy="144.00" r="3.5" fill="#1f77b4"><title>Only 2026-01-01 5.0</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">Only</text></g></svg>',
    );
    expect(svg).toContain("データ点 1");
    expect(svg).not.toContain("<path");
  });
});
