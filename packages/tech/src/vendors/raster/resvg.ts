import { Resvg } from "@resvg/resvg-js";
import type { SvgRasterizer } from "./types";

// The real rasterizer behind the SvgRasterizer port: resvg via its N-API
// binding (@resvg/resvg-js — see docs/dependency-decisions.md). Pure native
// code, no browser, no network — it runs headless and hermetically. SMIL/CSS
// animation is not executed; the judge sees the drawing's initial still frame,
// which is exactly what the rubric constraints are written against.

/** Fixed raster width so the judge always reads a same-scale drawing; part of
 * the instrument, so changing it is a manifest-version bump. */
export const RASTER_WIDTH_PX = 512;

/** Recorded in the run artifact as the raster provenance. The major version is
 * pinned in the name: a different engine (or engine major) is a different
 * instrument, never a silent swap. */
export const RESVG_ENGINE = "resvg-js@2";

export const createResvgRasterizer = (): SvgRasterizer => ({
  engine: RESVG_ENGINE,
  // async so an engine parse error surfaces as a rejection, per the port's
  // contract (the caller scores it 0), never as a synchronous throw.
  rasterize: async (svg: string) => {
    const rendered = new Resvg(svg, {
      fitTo: { mode: "width", value: RASTER_WIDTH_PX },
    }).render();
    return {
      base64: Buffer.from(rendered.asPng()).toString("base64"),
      mimeType: "image/png" as const,
    };
  },
});
