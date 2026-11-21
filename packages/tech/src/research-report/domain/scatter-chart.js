const COLORS = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 320;
const PLOT = {
  left: 72,
  right: 24,
  top: 32,
  bottom: 56,
};

/**
 * @typedef {Readonly<{ label: string, x: number, y: number }>} ScatterPoint
 * @typedef {Readonly<{ id: string, label: string, points: ReadonlyArray<ScatterPoint> }>} ScatterSeries
 * @typedef {Readonly<{
 *   id: string,
 *   title: string,
 *   description: string,
 *   xLabel: string,
 *   yLabel: string,
 *   series: ReadonlyArray<ScatterSeries>,
 *   width?: number,
 *   height?: number,
 *   xDigits?: number,
 *   yDigits?: number
 * }>} ScatterChartOptions
 */

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const coord = (value) => value.toFixed(2);

const isFinitePoint = (point) =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const numericDomain = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min !== max) return { min, max };
  const pad = Math.max(1, Math.abs(min) * 0.1);
  return { min: min - pad, max: max + pad };
};

const legend = (series, plotRight) =>
  series
    .slice(0, 9)
    .map((s, index) => {
      const y = 22 + index * 15;
      const color = COLORS[index % COLORS.length];
      return `<g><circle cx="${coord(plotRight - 124)}" cy="${coord(y - 4)}" r="3.5" fill="${color}"/><text x="${coord(plotRight - 112)}" y="${coord(y)}" font-size="10">${escapeXml(s.label)}</text></g>`;
    })
    .join("");

/**
 * Render a deterministic, dependency-free inline SVG scatter chart over two
 * independent numeric metrics (not a time axis, unlike `renderTimeSeriesChart`
 * in `./chart.js`).
 *
 * The function is pure: no IO, no wall-clock reads, no random values, and all
 * coordinates are rounded with a fixed precision. A point whose `x` or `y` is
 * not finite is dropped before any domain or layout math runs, so one bad
 * reading cannot skew the axes for the rest.
 *
 * @param {ScatterChartOptions} options
 * @returns {string}
 */
export const renderScatterChart = (options) => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const plotRight = width - PLOT.right;
  const plotBottom = height - PLOT.bottom;
  const plotWidth = width - PLOT.left - PLOT.right;
  const plotHeight = height - PLOT.top - PLOT.bottom;
  const titleId = `${options.id}-title`;
  const descId = `${options.id}-desc`;

  const plottedSeries = options.series.map((s) => ({
    series: s,
    points: s.points.filter(isFinitePoint),
  }));
  const allPoints = plottedSeries.flatMap((entry) => entry.points);

  if (allPoints.length === 0) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${escapeXml(titleId)} ${escapeXml(descId)}" viewBox="0 0 ${width} ${height}">`,
      `<title id="${escapeXml(titleId)}">${escapeXml(options.title)}</title>`,
      `<desc id="${escapeXml(descId)}">${escapeXml(options.description)}</desc>`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
      `<text x="${coord(width / 2)}" y="${coord(height / 2)}" text-anchor="middle" font-size="14">No plottable points</text>`,
      `</svg>`,
    ].join("");
  }

  const xDomain = numericDomain(allPoints.map((point) => point.x));
  const yDomain = numericDomain(allPoints.map((point) => point.y));
  const xFor = (x) =>
    PLOT.left + ((x - xDomain.min) / (xDomain.max - xDomain.min)) * plotWidth;
  const yFor = (y) =>
    PLOT.top + ((yDomain.max - y) / (yDomain.max - yDomain.min)) * plotHeight;
  const xDigits = options.xDigits ?? 1;
  const yDigits = options.yDigits ?? 1;

  const drawnSeries = plottedSeries
    .map((entry, index) => {
      if (entry.points.length === 0) return "";
      const color = COLORS[index % COLORS.length];
      const circles = entry.points
        .map(
          (point) =>
            `<circle cx="${coord(xFor(point.x))}" cy="${coord(yFor(point.y))}" r="4" fill="${color}" fill-opacity="0.85"><title>${escapeXml(entry.series.label)} ${escapeXml(point.label)} x=${point.x.toFixed(xDigits)} y=${point.y.toFixed(yDigits)}</title></circle>`,
        )
        .join("");
      return `<g>${circles}</g>`;
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${escapeXml(titleId)} ${escapeXml(descId)}" viewBox="0 0 ${width} ${height}">`,
    `<title id="${escapeXml(titleId)}">${escapeXml(options.title)}</title>`,
    `<desc id="${escapeXml(descId)}">${escapeXml(options.description)}</desc>`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
    `<line x1="${coord(PLOT.left)}" y1="${coord(plotBottom)}" x2="${coord(plotRight)}" y2="${coord(plotBottom)}" stroke="#333333" stroke-width="1"/>`,
    `<line x1="${coord(PLOT.left)}" y1="${coord(PLOT.top)}" x2="${coord(PLOT.left)}" y2="${coord(plotBottom)}" stroke="#333333" stroke-width="1"/>`,
    `<text x="${coord(PLOT.left)}" y="${coord(plotBottom + 18)}" font-size="10">${escapeXml(xDomain.min.toFixed(xDigits))}</text>`,
    `<text x="${coord(plotRight)}" y="${coord(plotBottom + 18)}" text-anchor="end" font-size="10">${escapeXml(xDomain.max.toFixed(xDigits))}</text>`,
    `<text x="${coord(width / 2)}" y="${coord(height - 10)}" text-anchor="middle" font-size="12">${escapeXml(options.xLabel)}</text>`,
    `<text x="14.00" y="${coord(height / 2)}" transform="rotate(-90 14.00 ${coord(height / 2)})" text-anchor="middle" font-size="12">${escapeXml(options.yLabel)}</text>`,
    `<text x="${coord(PLOT.left - 8)}" y="${coord(PLOT.top + 4)}" text-anchor="end" font-size="10">${escapeXml(yDomain.max.toFixed(yDigits))}</text>`,
    `<text x="${coord(PLOT.left - 8)}" y="${coord(plotBottom)}" text-anchor="end" font-size="10">${escapeXml(yDomain.min.toFixed(yDigits))}</text>`,
    drawnSeries,
    legend(options.series, plotRight),
    `</svg>`,
  ].join("");
};
