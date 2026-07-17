import { describe, expect, it } from "vitest";
import { createResvgRasterizer, RESVG_ENGINE } from "./resvg";
import { FIXTURE_ANIMATED_SVG, FIXTURE_STATIC_SVG } from "../llm/fixture";

// The real engine is keyless (no API, no network), so CI proves headless
// rasterization hermetically even though benchmark fixtures use the stub.
describe("createResvgRasterizer", () => {
  const PNG_SIGNATURE_HEX = "89504e470d0a1a0a";

  it("rasterizes a well-formed SVG to a PNG", async () => {
    const raster = await createResvgRasterizer().rasterize(FIXTURE_STATIC_SVG);
    expect(raster.mimeType).toBe("image/png");
    const bytes = Buffer.from(raster.base64, "base64");
    expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE_HEX);
  });

  it("rasterizes a SMIL-animated SVG (initial still frame)", async () => {
    const raster =
      await createResvgRasterizer().rasterize(FIXTURE_ANIMATED_SVG);
    const bytes = Buffer.from(raster.base64, "base64");
    expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE_HEX);
  });

  it("rejects source that is not SVG", async () => {
    await expect(
      createResvgRasterizer().rasterize("not an svg document"),
    ).rejects.toThrow();
  });

  it("is byte-stable across runs and names its engine", async () => {
    const rasterizer = createResvgRasterizer();
    const first = await rasterizer.rasterize(FIXTURE_STATIC_SVG);
    const second = await rasterizer.rasterize(FIXTURE_STATIC_SVG);
    expect(first.base64).toBe(second.base64);
    expect(rasterizer.engine).toBe(RESVG_ENGINE);
  });
});
