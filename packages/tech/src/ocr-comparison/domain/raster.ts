/**
 * The topic's raster primitives: a 5x7 bitmap font, pixel operations over a
 * plain RGB buffer, and a minimal PNG encoder.
 *
 * These lived inside `synthetic-image.ts` while one corpus rendered one layout.
 * The hard-input corpus (`hard-corpus.ts`) renders three more layouts at three
 * different glyph scales, so the primitives are extracted here rather than
 * duplicated. The extraction is deliberately behavior-preserving: `drawText`
 * and `drawGlyph` take `scale` as an argument whose default is the v1 corpus's
 * `SCALE`, so the committed v1 fixture renders byte-identically. That
 * byte-stability is checked by `make drift`, and it is the reason no default
 * here may be "improved" without bumping a corpus version.
 */
import { deflateSync } from "node:zlib";

export const WHITE = 255;
export const BLACK = 0;

/** The v1 corpus's glyph scale. Every default below is stated against it. */
export const DEFAULT_SCALE = 4;
export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
export const LETTER_SPACING = 1;

const glyph = (rows: ReadonlyArray<string>): ReadonlyArray<string> => rows;

export const GLYPHS: Readonly<Record<string, ReadonlyArray<string>>> = {
  " ": glyph(["00000", "00000", "00000", "00000", "00000", "00000", "00000"]),
  "-": glyph(["00000", "00000", "00000", "11111", "00000", "00000", "00000"]),
  ".": glyph(["00000", "00000", "00000", "00000", "00000", "01100", "01100"]),
  ":": glyph(["00000", "01100", "01100", "00000", "01100", "01100", "00000"]),
  "/": glyph(["00001", "00010", "00100", "01000", "10000", "00000", "00000"]),
  "0": glyph(["01110", "10001", "10011", "10101", "11001", "10001", "01110"]),
  "1": glyph(["00100", "01100", "00100", "00100", "00100", "00100", "01110"]),
  "2": glyph(["01110", "10001", "00001", "00010", "00100", "01000", "11111"]),
  "3": glyph(["11110", "00001", "00001", "01110", "00001", "00001", "11110"]),
  "4": glyph(["00010", "00110", "01010", "10010", "11111", "00010", "00010"]),
  "5": glyph(["11111", "10000", "10000", "11110", "00001", "00001", "11110"]),
  "6": glyph(["01110", "10000", "10000", "11110", "10001", "10001", "01110"]),
  "7": glyph(["11111", "00001", "00010", "00100", "01000", "01000", "01000"]),
  "8": glyph(["01110", "10001", "10001", "01110", "10001", "10001", "01110"]),
  "9": glyph(["01110", "10001", "10001", "01111", "00001", "00001", "01110"]),
  A: glyph(["01110", "10001", "10001", "11111", "10001", "10001", "10001"]),
  B: glyph(["11110", "10001", "10001", "11110", "10001", "10001", "11110"]),
  C: glyph(["01110", "10001", "10000", "10000", "10000", "10001", "01110"]),
  D: glyph(["11110", "10001", "10001", "10001", "10001", "10001", "11110"]),
  E: glyph(["11111", "10000", "10000", "11110", "10000", "10000", "11111"]),
  F: glyph(["11111", "10000", "10000", "11110", "10000", "10000", "10000"]),
  G: glyph(["01110", "10001", "10000", "10111", "10001", "10001", "01110"]),
  H: glyph(["10001", "10001", "10001", "11111", "10001", "10001", "10001"]),
  I: glyph(["01110", "00100", "00100", "00100", "00100", "00100", "01110"]),
  J: glyph(["00111", "00010", "00010", "00010", "10010", "10010", "01100"]),
  K: glyph(["10001", "10010", "10100", "11000", "10100", "10010", "10001"]),
  L: glyph(["10000", "10000", "10000", "10000", "10000", "10000", "11111"]),
  M: glyph(["10001", "11011", "10101", "10101", "10001", "10001", "10001"]),
  N: glyph(["10001", "11001", "10101", "10011", "10001", "10001", "10001"]),
  O: glyph(["01110", "10001", "10001", "10001", "10001", "10001", "01110"]),
  P: glyph(["11110", "10001", "10001", "11110", "10000", "10000", "10000"]),
  Q: glyph(["01110", "10001", "10001", "10001", "10101", "10010", "01101"]),
  R: glyph(["11110", "10001", "10001", "11110", "10100", "10010", "10001"]),
  S: glyph(["01111", "10000", "10000", "01110", "00001", "00001", "11110"]),
  T: glyph(["11111", "00100", "00100", "00100", "00100", "00100", "00100"]),
  U: glyph(["10001", "10001", "10001", "10001", "10001", "10001", "01110"]),
  V: glyph(["10001", "10001", "10001", "10001", "10001", "01010", "00100"]),
  W: glyph(["10001", "10001", "10001", "10101", "10101", "10101", "01010"]),
  X: glyph(["10001", "10001", "01010", "00100", "01010", "10001", "10001"]),
  Y: glyph(["10001", "10001", "01010", "00100", "00100", "00100", "00100"]),
  Z: glyph(["11111", "00001", "00010", "00100", "01000", "10000", "11111"]),
};

/** The characters the font can draw. Anything else renders as a space. */
export const SUPPORTED_CHARACTERS: ReadonlyArray<string> = Object.keys(GLYPHS);

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer: Buffer): number => {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Buffer): Buffer => {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
};

export const putPixel = (
  pixels: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  value: number,
): void => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 3;
  pixels[offset] = value;
  pixels[offset + 1] = value;
  pixels[offset + 2] = value;
};

export const fillRect = (
  pixels: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  value: number,
): void => {
  for (let yy = y; yy < y + rectHeight; yy += 1) {
    for (let xx = x; xx < x + rectWidth; xx += 1) {
      putPixel(pixels, width, height, xx, yy, value);
    }
  }
};

export const drawGlyph = (
  pixels: Buffer,
  width: number,
  height: number,
  char: string,
  x: number,
  y: number,
  scale: number = DEFAULT_SCALE,
): void => {
  const rows = GLYPHS[char] ?? GLYPHS[" "] ?? [];
  for (const [rowIndex, row] of rows.entries()) {
    for (const [columnIndex, bit] of Array.from(row).entries()) {
      if (bit === "1") {
        fillRect(
          pixels,
          width,
          height,
          x + columnIndex * scale,
          y + rowIndex * scale,
          scale,
          scale,
          BLACK,
        );
      }
    }
  }
};

/** Horizontal advance, in pixels, of one character at `scale`. */
export const advanceFor = (scale: number): number =>
  (GLYPH_WIDTH + LETTER_SPACING) * scale;

/** Height, in pixels, of one glyph row at `scale`. */
export const glyphHeightFor = (scale: number): number => GLYPH_HEIGHT * scale;

/** Width, in pixels, that `text` occupies at `scale`. */
export const textWidth = (text: string, scale: number): number =>
  text.length === 0
    ? 0
    : text.length * advanceFor(scale) - LETTER_SPACING * scale;

export const drawText = (
  pixels: Buffer,
  width: number,
  height: number,
  text: string,
  x: number,
  y: number,
  scale: number = DEFAULT_SCALE,
): void => {
  const advance = advanceFor(scale);
  for (const [index, char] of Array.from(text.toUpperCase()).entries()) {
    drawGlyph(pixels, width, height, char, x + index * advance, y, scale);
  }
};

export const encodePng = (
  width: number,
  height: number,
  pixels: Buffer,
): Buffer => {
  const scanlineWidth = width * 3 + 1;
  const raw = Buffer.alloc(scanlineWidth * height);
  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * scanlineWidth;
    raw[rawOffset] = 0;
    pixels.copy(raw, rawOffset + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};
