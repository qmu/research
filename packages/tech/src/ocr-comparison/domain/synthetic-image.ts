import { createHash } from "node:crypto";
import type { VisionImageInput } from "../../vendors/llm/types";
import {
  BLACK,
  DEFAULT_SCALE,
  GLYPH_HEIGHT,
  WHITE,
  drawText,
  encodePng,
  fillRect,
} from "./raster";
import type { OcrDataset, OcrDocument, RenderedOcrDocument } from "./types";

/**
 * The v1 easy corpus's page layout. The raster primitives now live in
 * `raster.ts` so the hard-input corpus can share them; every constant below is
 * unchanged and this renderer's output is byte-identical to the pre-extraction
 * version, which is what `make drift` asserts against the committed fixture.
 */
const LINE_SPACING = 5;
const MARGIN_X = 48;
const MARGIN_Y = 44;

export const renderSyntheticDocumentPng = (
  dataset: OcrDataset,
  document: OcrDocument,
): Buffer => {
  const { widthPx, heightPx } = dataset.preprocessing.resolution;
  const pixels = Buffer.alloc(widthPx * heightPx * 3, WHITE);
  fillRect(pixels, widthPx, heightPx, 32, 28, widthPx - 64, 3, BLACK);
  fillRect(
    pixels,
    widthPx,
    heightPx,
    32,
    heightPx - 32,
    widthPx - 64,
    3,
    BLACK,
  );
  const lineAdvance = GLYPH_HEIGHT * DEFAULT_SCALE + LINE_SPACING;
  for (const [index, line] of document.render.lines.entries()) {
    drawText(
      pixels,
      widthPx,
      heightPx,
      line,
      MARGIN_X,
      MARGIN_Y + index * lineAdvance,
    );
  }
  return encodePng(widthPx, heightPx, pixels);
};

export const renderOcrDocument = (
  dataset: OcrDataset,
  document: OcrDocument,
): RenderedOcrDocument => {
  const png = renderSyntheticDocumentPng(dataset, document);
  const sha256 = createHash("sha256").update(png).digest("hex");
  const image: VisionImageInput = {
    base64: png.toString("base64"),
    mimeType: dataset.preprocessing.mimeType,
    pageNumber: 1,
    label: document.id,
  };
  return { document, image, sha256 };
};
