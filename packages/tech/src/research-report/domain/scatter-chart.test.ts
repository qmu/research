import { describe, expect, it } from "vitest";
import { renderScatterChart } from "./scatter-chart.js";

describe("renderScatterChart", () => {
  it("renders the no-data placeholder when every series is empty", () => {
    expect(
      renderScatterChart({
        id: "empty-chart",
        title: "Empty chart",
        description: "No points.",
        xLabel: "X",
        yLabel: "Y",
        series: [],
      }),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="empty-chart-title empty-chart-desc" viewBox="0 0 640 320"><title id="empty-chart-title">Empty chart</title><desc id="empty-chart-desc">No points.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><text x="320.00" y="160.00" text-anchor="middle" font-size="14">No plottable points</text></svg>',
    );
  });

  it("renders a known two-point series with fixed coordinates, aria attributes, and a legend", () => {
    expect(
      renderScatterChart({
        id: "two-point-chart",
        title: "Two point chart",
        description: "Two points, one series.",
        xLabel: "Initial delay (ms)",
        yLabel: "Peak RSS (MiB)",
        series: [
          {
            id: "a",
            label: "Engine A",
            points: [
              { label: "run-1", x: 0, y: 1000 },
              { label: "run-2", x: 100, y: 0 },
            ],
          },
        ],
      }),
    ).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="two-point-chart-title two-point-chart-desc" viewBox="0 0 640 320"><title id="two-point-chart-title">Two point chart</title><desc id="two-point-chart-desc">Two points, one series.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="72.00" y1="264.00" x2="616.00" y2="264.00" stroke="#333333" stroke-width="1"/><line x1="72.00" y1="32.00" x2="72.00" y2="264.00" stroke="#333333" stroke-width="1"/><text x="72.00" y="282.00" font-size="10">0.0</text><text x="616.00" y="282.00" text-anchor="end" font-size="10">100.0</text><text x="320.00" y="310.00" text-anchor="middle" font-size="12">Initial delay (ms)</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Peak RSS (MiB)</text><text x="64.00" y="36.00" text-anchor="end" font-size="10">1000.0</text><text x="64.00" y="264.00" text-anchor="end" font-size="10">0.0</text><g><circle cx="72.00" cy="32.00" r="4" fill="#1f77b4" fill-opacity="0.85"><title>Engine A run-1 x=0.0 y=1000.0</title></circle><circle cx="616.00" cy="264.00" r="4" fill="#1f77b4" fill-opacity="0.85"><title>Engine A run-2 x=100.0 y=0.0</title></circle></g><g><circle cx="492.00" cy="18.00" r="3.5" fill="#1f77b4"/><text x="504.00" y="22.00" font-size="10">Engine A</text></g></svg>',
    );
  });

  it("drops a non-finite point and pads a single remaining point's degenerate domain", () => {
    const svg = renderScatterChart({
      id: "filtered-chart",
      title: "Filtered chart",
      description: "One bad reading, one good reading.",
      xLabel: "X",
      yLabel: "Y",
      series: [
        {
          id: "a",
          label: "Engine A",
          points: [
            { label: "bad", x: Number.NaN, y: 5 },
            { label: "good", x: 10, y: 20 },
          ],
        },
      ],
    });

    expect(svg).toContain('cx="344.00" cy="148.00"');
    expect(svg).toContain("x=10.0 y=20.0");
    expect(svg).not.toContain("bad");
    expect(svg.match(/fill-opacity="0.85"/g)).toHaveLength(1);
  });

  it("cycles legend colors and markers across multiple series", () => {
    const svg = renderScatterChart({
      id: "multi-series-chart",
      title: "Multi series chart",
      description: "Two engines.",
      xLabel: "X",
      yLabel: "Y",
      series: [
        { id: "a", label: "Engine A", points: [{ label: "r1", x: 1, y: 1 }] },
        { id: "b", label: "Engine B", points: [{ label: "r2", x: 2, y: 2 }] },
      ],
    });

    expect(svg).toContain('fill="#1f77b4" fill-opacity="0.85"');
    expect(svg).toContain('fill="#d62728" fill-opacity="0.85"');
    expect(svg).toContain(">Engine A</text>");
    expect(svg).toContain(">Engine B</text>");
  });
});
