import { describe, expect, it } from "vitest";
import {
  NO_DEGRADATION,
  applyDegradation,
  blockQuantize,
  createRng,
  resample,
  speckle,
  toneQuantize,
} from "./degradation";

const page = (width: number, height: number, fill = 255): Buffer =>
  Buffer.alloc(width * height * 3, fill);

const greyAt = (pixels: Buffer, width: number, x: number, y: number): number =>
  pixels[(y * width + x) * 3] ?? -1;

const distinctGreys = (pixels: Buffer): number => {
  const seen = new Set<number>();
  for (let i = 0; i < pixels.length; i += 3) seen.add(pixels[i] ?? 0);
  return seen.size;
};

describe("seeded PRNG", () => {
  it("reproduces its sequence from the same seed", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const first = Array.from({ length: 8 }, () => a());
    const second = Array.from({ length: 8 }, () => b());
    expect(second).toEqual(first);
  });

  it("produces a different sequence from a different seed", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it("stays inside the unit interval", () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("resample", () => {
  it("destroys detail below the sample grid", () => {
    const pixels = page(8, 8);
    // One black pixel cannot survive a 4x box average back to black.
    pixels[0] = 0;
    pixels[1] = 0;
    pixels[2] = 0;
    resample(pixels, 8, 8, 4);
    expect(greyAt(pixels, 8, 0, 0)).toBeGreaterThan(0);
  });

  it("leaves the buffer untouched at factor 1", () => {
    const pixels = page(4, 4);
    pixels[0] = 0;
    const before = Buffer.from(pixels);
    resample(pixels, 4, 4, 1);
    expect(pixels.equals(before)).toBe(true);
  });

  it("keeps the page dimensions, so no class is identifiable by geometry", () => {
    const pixels = page(12, 9);
    const length = pixels.length;
    resample(pixels, 12, 9, 3);
    expect(pixels.length).toBe(length);
  });
});

describe("blockQuantize", () => {
  it("flattens a block toward its own mean", () => {
    const pixels = page(2, 2, 0);
    pixels[0] = 255;
    pixels[1] = 255;
    pixels[2] = 255;
    blockQuantize(pixels, 2, 2, 2, 1);
    // Mean of one white and three black pixels, fully applied.
    const mean = Math.round(255 / 4);
    for (let i = 0; i < 4; i += 1) {
      expect(greyAt(pixels, 2, i % 2, Math.floor(i / 2))).toBe(mean);
    }
  });

  it("is a no-op at zero strength", () => {
    const pixels = page(4, 4, 128);
    pixels[0] = 0;
    const before = Buffer.from(pixels);
    blockQuantize(pixels, 4, 4, 8, 0);
    expect(pixels.equals(before)).toBe(true);
  });
});

describe("toneQuantize", () => {
  it("reduces the page to the requested number of greys", () => {
    const pixels = page(16, 1);
    for (let x = 0; x < 16; x += 1) {
      const value = x * 17;
      pixels[x * 3] = value;
      pixels[x * 3 + 1] = value;
      pixels[x * 3 + 2] = value;
    }
    toneQuantize(pixels, 16, 1, 4);
    expect(distinctGreys(pixels)).toBeLessThanOrEqual(4);
  });

  it("is a no-op at full depth", () => {
    const pixels = page(4, 4, 137);
    const before = Buffer.from(pixels);
    toneQuantize(pixels, 4, 4, 256);
    expect(pixels.equals(before)).toBe(true);
  });
});

describe("speckle", () => {
  it("changes some pixels and stays inside the byte range", () => {
    const pixels = page(32, 32, 128);
    speckle(pixels, 32, 32, 1, 90, createRng(7));
    let changed = 0;
    for (let i = 0; i < pixels.length; i += 3) {
      const value = pixels[i] ?? 0;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
      if (value !== 128) changed += 1;
    }
    expect(changed).toBeGreaterThan(0);
  });

  it("is a no-op at zero probability", () => {
    const pixels = page(8, 8, 200);
    const before = Buffer.from(pixels);
    speckle(pixels, 8, 8, 0, 90, createRng(7));
    expect(pixels.equals(before)).toBe(true);
  });
});

describe("applyDegradation", () => {
  it("leaves a page untouched under the no-op profile", () => {
    const pixels = page(24, 16, 40);
    const before = Buffer.from(pixels);
    applyDegradation(pixels, 24, 16, NO_DEGRADATION);
    expect(pixels.equals(before)).toBe(true);
  });

  it("is reproducible for a given profile", () => {
    const profile = {
      downscaleFactor: 2,
      blockSize: 4,
      blockStrength: 0.5,
      toneLevels: 8,
      speckleProbability: 0.2,
      speckleMagnitude: 60,
      seed: 4242,
    };
    const first = page(32, 32, 200);
    first[0] = 0;
    const second = Buffer.from(first);
    applyDegradation(first, 32, 32, profile);
    applyDegradation(second, 32, 32, profile);
    expect(second.equals(first)).toBe(true);
  });

  it("actually degrades — the result differs from the input", () => {
    const pixels = page(32, 32, 255);
    for (let x = 0; x < 32; x += 2) {
      pixels[x * 3] = 0;
      pixels[x * 3 + 1] = 0;
      pixels[x * 3 + 2] = 0;
    }
    const before = Buffer.from(pixels);
    applyDegradation(pixels, 32, 32, {
      downscaleFactor: 3,
      blockSize: 8,
      blockStrength: 0.55,
      toneLevels: 6,
      speckleProbability: 0.04,
      speckleMagnitude: 70,
      seed: 11,
    });
    expect(pixels.equals(before)).toBe(false);
  });
});
