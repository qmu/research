import { FIXTURE_VISION_IMAGE } from "../llm/fixture";
import type { SvgRasterizer } from "./types";

// Deterministic rasterizer stub for the keyless path: anything that looks like
// an <svg> document yields the committed 1x1 PNG the vision fixtures share, so
// the rasterize → judge → score pipeline runs end to end, byte-stable, with no
// native engine loaded. Non-SVG input rejects, mirroring how the real engine
// refuses unparseable source — the caller's score-0 path is exercised the same
// way on both rasterizers.
export const FIXTURE_RASTER_ENGINE = "fixture-raster";

export const createFixtureSvgRasterizer = (): SvgRasterizer => ({
  engine: FIXTURE_RASTER_ENGINE,
  rasterize: (svg: string) =>
    /<svg[\s/>]/i.test(svg)
      ? Promise.resolve({
          base64: FIXTURE_VISION_IMAGE.base64,
          mimeType: FIXTURE_VISION_IMAGE.mimeType,
        })
      : Promise.reject(
          new Error("fixture rasterizer: input is not an <svg> document"),
        ),
});
