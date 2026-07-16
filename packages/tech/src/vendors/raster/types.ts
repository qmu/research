// Anti-corruption layer contract for SVG rasterization. The domain depends only
// on this shape, never on a rasterizer library — so the engine can be swapped
// (resvg → a headless-browser render) without touching benchmark logic. The
// output reuses the vision port's MIME vocabulary because a raster exists solely
// to be fed to a vision judge.

import type { VisionMimeType } from "../llm/types";

export type RasterizedSvg = Readonly<{
  base64: string;
  mimeType: VisionMimeType;
}>;

export type SvgRasterizer = Readonly<{
  /** Engine identifier recorded in the run artifact — part of the instrument's
   * provenance, so a raster produced by a different engine is never silently
   * compared against these scores. */
  engine: string;
  /** Renders SVG source to a raster image. Rejects on source the engine cannot
   * render; the caller scores such a drawing 0, it never crashes the run. */
  rasterize: (svg: string) => Promise<RasterizedSvg>;
}>;
