/**
 * Renders a `HardPage` to a PNG, then applies the page's degradation profile.
 *
 * Kept separate from `synthetic-image.ts` on purpose: that file is the v1 easy
 * corpus's layout and its output is byte-frozen by `make drift`. This renderer
 * is free to grow with the hard classes without putting that fixture at risk,
 * and both draw through the same primitives in `raster.ts`.
 */
import { createHash } from "node:crypto";
import type { VisionImageInput } from "../../vendors/llm/types";
import { applyDegradation } from "./degradation";
import { HARD_PAGE_HEIGHT, HARD_PAGE_WIDTH } from "./hard-corpus";
import type { HardDocument, HardPage } from "./hard-corpus";
import {
  BLACK,
  WHITE,
  drawText,
  encodePng,
  fillRect,
  glyphHeightFor,
} from "./raster";

export type RenderedHardDocument = Readonly<{
  document: HardDocument;
  image: VisionImageInput;
  sha256: string;
}>;

export const renderHardPagePng = (page: HardPage): Buffer => {
  const width = HARD_PAGE_WIDTH;
  const height = HARD_PAGE_HEIGHT;
  const pixels = Buffer.alloc(width * height * 3, WHITE);
  for (const rule of page.rules) {
    fillRect(
      pixels,
      width,
      height,
      rule.x,
      rule.y,
      rule.width,
      rule.height,
      BLACK,
    );
  }
  const lineAdvance = glyphHeightFor(page.scale) + page.lineSpacing;
  for (const [rowIndex, row] of page.rows.entries()) {
    const y = page.marginY + rowIndex * lineAdvance;
    for (const cell of row.cells) {
      const x = page.columns[cell.column] ?? page.marginX;
      drawText(pixels, width, height, cell.text, x, y, page.scale);
    }
  }
  applyDegradation(pixels, width, height, page.degradation);
  return encodePng(width, height, pixels);
};

export const renderHardDocument = (
  document: HardDocument,
): RenderedHardDocument => {
  const png = renderHardPagePng(document.page);
  return {
    document,
    image: {
      base64: png.toString("base64"),
      mimeType: "image/png",
      pageNumber: 1,
      label: document.id,
    },
    sha256: createHash("sha256").update(png).digest("hex"),
  };
};

/**
 * The bottom of the lowest drawn row. A generator whose rows run past the page
 * would silently lose ground-truth text off the canvas, so callers check this
 * against the page height rather than trusting the row counts.
 */
export const lowestDrawnY = (page: HardPage): number => {
  if (page.rows.length === 0) return page.marginY;
  const lineAdvance = glyphHeightFor(page.scale) + page.lineSpacing;
  return (
    page.marginY +
    (page.rows.length - 1) * lineAdvance +
    glyphHeightFor(page.scale)
  );
};
