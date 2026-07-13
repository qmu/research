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

const DASHES = ["", "5 3", "2 3", "8 3 2 3", "1 3"];

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 320;
const PLOT = {
  left: 64,
  right: 24,
  top: 32,
  bottom: 64,
};

/**
 * @typedef {Readonly<{ lower: number, upper: number }>} TimeSeriesInterval
 * @typedef {Readonly<{ measuredAt: string, value: number, interval?: TimeSeriesInterval }>} TimeSeriesPoint
 * @typedef {Readonly<{ id: string, label: string, points: ReadonlyArray<TimeSeriesPoint> }>} TimeSeries
 * @typedef {Readonly<{
 *   id: string,
 *   title: string,
 *   description: string,
 *   xLabel: string,
 *   yLabel: string,
 *   series: ReadonlyArray<TimeSeries>,
 *   width?: number,
 *   height?: number,
 *   valueDigits?: number
 * }>} TimeSeriesChartOptions
 */

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const coord = (value) => value.toFixed(2);

const finitePoints = (series) =>
  series
    .flatMap((s) =>
      s.points.map((point) => ({
        series: s,
        point,
        time: Date.parse(point.measuredAt),
      })),
    )
    .filter(
      (item) => Number.isFinite(item.time) && Number.isFinite(item.point.value),
    );

const formatDate = (measuredAt) => measuredAt.slice(0, 10);

const domainForValues = (points) => {
  const values = points.flatMap(({ point }) => [
    point.interval?.lower ?? point.value,
    point.interval?.upper ?? point.value,
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min !== max) {
    return { min, max };
  }
  const pad = Math.max(1, Math.abs(min) * 0.1);
  return { min: min - pad, max: max + pad };
};

const seriesPath = (points, xFor, yFor) =>
  points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${coord(xFor(point))} ${coord(yFor(point.value))}`;
    })
    .join(" ");

const uniqueTimes = (points) =>
  [...new Set(points.map((item) => item.time))].sort((a, b) => a - b);

const legend = (series, plotRight) =>
  series
    .slice(0, 9)
    .map((s, index) => {
      const y = 22 + index * 15;
      const color = COLORS[index % COLORS.length];
      const dash = DASHES[index % DASHES.length];
      const dashAttr = dash === "" ? "" : ` stroke-dasharray="${dash}"`;
      return `<g><line x1="${coord(plotRight - 132)}" y1="${coord(y - 4)}" x2="${coord(plotRight - 112)}" y2="${coord(y - 4)}" stroke="${color}" stroke-width="2"${dashAttr}/><text x="${coord(plotRight - 108)}" y="${coord(y)}" font-size="10">${escapeXml(s.label)}</text></g>`;
    })
    .join("");

/**
 * Render a deterministic, dependency-free inline SVG time-series chart.
 *
 * The function is pure: no IO, no wall-clock reads, no random values, and all
 * coordinates are rounded with a fixed precision.
 *
 * @param {TimeSeriesChartOptions} options
 * @returns {string}
 */
export const renderTimeSeriesChart = (options) => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const plotRight = width - PLOT.right;
  const plotBottom = height - PLOT.bottom;
  const plotWidth = width - PLOT.left - PLOT.right;
  const plotHeight = height - PLOT.top - PLOT.bottom;
  const points = finitePoints(options.series);
  const titleId = `${options.id}-title`;
  const descId = `${options.id}-desc`;

  if (points.length === 0) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${escapeXml(titleId)} ${escapeXml(descId)}" viewBox="0 0 ${width} ${height}">`,
      `<title id="${escapeXml(titleId)}">${escapeXml(options.title)}</title>`,
      `<desc id="${escapeXml(descId)}">${escapeXml(options.description)}</desc>`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
      `<text x="${coord(width / 2)}" y="${coord(height / 2)}" text-anchor="middle" font-size="14">No measured history points</text>`,
      `</svg>`,
    ].join("");
  }

  const times = uniqueTimes(points);
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const values = domainForValues(points);
  const xFor = (point) => {
    const time = Date.parse(point.measuredAt);
    return minTime === maxTime
      ? PLOT.left + plotWidth / 2
      : PLOT.left + ((time - minTime) / (maxTime - minTime)) * plotWidth;
  };
  const yFor = (value) =>
    PLOT.top + ((values.max - value) / (values.max - values.min)) * plotHeight;
  const valueDigits = options.valueDigits ?? 1;
  const startLabel = formatDate(
    points.find((p) => p.time === minTime)?.point.measuredAt ?? "",
  );
  const endLabel = formatDate(
    points.find((p) => p.time === maxTime)?.point.measuredAt ?? "",
  );

  const drawnSeries = options.series
    .map((s, index) => {
      const plotted = s.points
        .filter(
          (point) =>
            Number.isFinite(Date.parse(point.measuredAt)) &&
            Number.isFinite(point.value),
        )
        .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt));
      if (plotted.length === 0) return "";
      const color = COLORS[index % COLORS.length];
      const dash = DASHES[index % DASHES.length];
      const dashAttr = dash === "" ? "" : ` stroke-dasharray="${dash}"`;
      const seriesTimes = uniqueTimes(
        plotted.map((point) => ({
          series: s,
          point,
          time: Date.parse(point.measuredAt),
        })),
      );
      const path =
        plotted.length >= 2 && seriesTimes.length >= 2
          ? `<path d="${seriesPath(plotted, xFor, yFor)}" fill="none" stroke="${color}" stroke-width="2"${dashAttr}/>`
          : "";
      const bars = plotted
        .filter((point) => point.interval !== undefined)
        .map((point) => {
          const x = xFor(point);
          const lower = yFor(point.interval.lower);
          const upper = yFor(point.interval.upper);
          return `<g stroke="${color}" stroke-width="1.5"><line x1="${coord(x)}" y1="${coord(upper)}" x2="${coord(x)}" y2="${coord(lower)}"/><line x1="${coord(x - 4)}" y1="${coord(upper)}" x2="${coord(x + 4)}" y2="${coord(upper)}"/><line x1="${coord(x - 4)}" y1="${coord(lower)}" x2="${coord(x + 4)}" y2="${coord(lower)}"/></g>`;
        })
        .join("");
      const circles = plotted
        .map(
          (point) =>
            `<circle cx="${coord(xFor(point))}" cy="${coord(yFor(point.value))}" r="3.5" fill="${color}"><title>${escapeXml(s.label)} ${formatDate(point.measuredAt)} ${point.value.toFixed(valueDigits)}</title></circle>`,
        )
        .join("");
      return `<g>${path}${bars}${circles}</g>`;
    })
    .join("");

  const annotation =
    times.length === 1
      ? `<text x="${coord(PLOT.left)}" y="${coord(PLOT.top - 10)}" font-size="12" font-weight="700">データ点 1</text>`
      : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${escapeXml(titleId)} ${escapeXml(descId)}" viewBox="0 0 ${width} ${height}">`,
    `<title id="${escapeXml(titleId)}">${escapeXml(options.title)}</title>`,
    `<desc id="${escapeXml(descId)}">${escapeXml(options.description)}</desc>`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
    `<line x1="${coord(PLOT.left)}" y1="${coord(plotBottom)}" x2="${coord(plotRight)}" y2="${coord(plotBottom)}" stroke="#333333" stroke-width="1"/>`,
    `<line x1="${coord(PLOT.left)}" y1="${coord(PLOT.top)}" x2="${coord(PLOT.left)}" y2="${coord(plotBottom)}" stroke="#333333" stroke-width="1"/>`,
    `<text x="${coord(PLOT.left)}" y="${coord(plotBottom + 20)}" font-size="10">${escapeXml(startLabel)}</text>`,
    `<text x="${coord(plotRight)}" y="${coord(plotBottom + 20)}" text-anchor="end" font-size="10">${escapeXml(endLabel)}</text>`,
    `<text x="${coord(width / 2)}" y="${coord(height - 14)}" text-anchor="middle" font-size="12">${escapeXml(options.xLabel)}</text>`,
    `<text x="14.00" y="${coord(height / 2)}" transform="rotate(-90 14.00 ${coord(height / 2)})" text-anchor="middle" font-size="12">${escapeXml(options.yLabel)}</text>`,
    `<text x="${coord(PLOT.left - 8)}" y="${coord(PLOT.top + 4)}" text-anchor="end" font-size="10">${escapeXml(values.max.toFixed(valueDigits))}</text>`,
    `<text x="${coord(PLOT.left - 8)}" y="${coord(plotBottom)}" text-anchor="end" font-size="10">${escapeXml(values.min.toFixed(valueDigits))}</text>`,
    annotation,
    drawnSeries,
    legend(options.series, plotRight),
    `</svg>`,
  ].join("");
};
