import type { Stat } from "./types";
import { isWellFormedXml, rootElementName } from "./xml";

/**
 * Pure, mechanical scoring for the SVG-generation benchmark. Every score is
 * computed from the SVG source itself — no rasterizer, no aesthetic judgement.
 * The prompt-fidelity metric (does the drawing match the request) needs a vision
 * judge over a rendered raster and arrives with a later ticket; these three
 * metrics are what the keyless path can measure honestly today.
 */

/** Render validity: 1 when the source is well-formed XML whose root element is
 * `<svg>` (namespace prefix ignored), else 0. Returns numbers so a run
 * aggregates them as a pass ratio. */
export const scoreRenderValidity = (svg: string): number => {
  if (!isWellFormedXml(svg)) return 0;
  const root = rootElementName(svg);
  if (root === null) return 0;
  const local = root.includes(":") ? root.slice(root.indexOf(":") + 1) : root;
  return local.toLowerCase() === "svg" ? 1 : 0;
};

const DRAWABLE_ELEMENTS = [
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
];

/** Path complexity: the count of drawable elements plus the count of path
 * commands across every `d` attribute. A larger number reads as more detail; it
 * is descriptive, not a quality verdict. */
export const scorePathComplexity = (svg: string): number => {
  const elements = DRAWABLE_ELEMENTS.reduce((sum, tag) => {
    const matches = svg.match(new RegExp(`<${tag}\\b`, "gi"));
    return sum + (matches ? matches.length : 0);
  }, 0);

  let commands = 0;
  const dAttr = /\bd\s*=\s*"([^"]*)"|\bd\s*=\s*'([^']*)'/gi;
  let m: RegExpExecArray | null;
  while ((m = dAttr.exec(svg)) !== null) {
    const path = m[1] ?? m[2] ?? "";
    const cmds = path.match(/[MmLlHhVvCcSsQqTtAaZz]/g);
    commands += cmds ? cmds.length : 0;
  }

  return elements + commands;
};

/** True when the SVG carries a SMIL or CSS animation. */
export const hasAnimation = (svg: string): boolean => {
  const smil =
    /<(animate|animateTransform|animateMotion|animateColor|set)\b/i.test(svg);
  const css = /@keyframes|animation\s*:|animation-name\s*:/i.test(svg);
  return smil || css;
};

/** Animation presence for an `animated` prompt: 1 if the SVG animates, else 0. */
export const scoreAnimationPresence = (svg: string): number =>
  hasAnimation(svg) ? 1 : 0;

/** Mean, sample standard deviation, and count. n=0 yields all-zero; n=1 yields
 * stdDev 0 — mirroring the other topics' aggregation conventions. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};
