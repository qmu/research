/**
 * Deterministic scan-like degradation of a rendered page.
 *
 * The ticket asks for difficulty that is *representative* — "jaggy/low-res
 * should mimic real scan/compression artifacts (not just Gaussian noise)" — and
 * for a corpus that is stable across surveys, so history connects like with
 * like. Both constraints point the same way: every operation here is a pure
 * function of the pixel buffer and a seeded PRNG, with no clock, no crypto
 * randomness, and no floating-point accumulation across pixels. Re-running a
 * profile reproduces the page byte for byte.
 *
 * The four operations compose into the artifact chain a real scan actually
 * leaves, in the order it leaves it:
 *
 *   resample → block quantization → tone quantization → speckle
 *
 * That order matters. Downscaling first is what destroys stroke detail; running
 * it after the block step would smooth the very artifacts the block step exists
 * to introduce, and the page would read as merely blurry rather than as a bad
 * scan.
 */

export type DegradationProfile = Readonly<{
  /** Integer resample factor. 1 leaves the page at full resolution. */
  downscaleFactor: number;
  /** Side of the square block for the compression-artifact step, in pixels. */
  blockSize: number;
  /** 0..1 — how far each block is pulled toward its own mean. */
  blockStrength: number;
  /** Distinct grey levels kept. 256 is a no-op. */
  toneLevels: number;
  /** 0..1 — probability that a given pixel takes a speckle hit. */
  speckleProbability: number;
  /** Maximum magnitude, in grey levels, of a speckle hit. */
  speckleMagnitude: number;
  /** Seed for the speckle PRNG. Part of the corpus version. */
  seed: number;
}>;

export const NO_DEGRADATION: DegradationProfile = {
  downscaleFactor: 1,
  blockSize: 1,
  blockStrength: 0,
  toneLevels: 256,
  speckleProbability: 0,
  speckleMagnitude: 0,
  seed: 0,
};

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG.
 *
 * Chosen over `Math.random` because the corpus must be reproducible, and over a
 * hash-per-pixel because a sequential generator makes the speckle pattern a
 * function of traversal order, which is fixed here and therefore stable.
 */
export const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clampByte = (value: number): number =>
  value < 0 ? 0 : value > 255 ? 255 : Math.round(value);

const grey = (pixels: Buffer, width: number, x: number, y: number): number =>
  pixels[(y * width + x) * 3] ?? 0;

const setGrey = (
  pixels: Buffer,
  width: number,
  x: number,
  y: number,
  value: number,
): void => {
  const offset = (y * width + x) * 3;
  pixels[offset] = value;
  pixels[offset + 1] = value;
  pixels[offset + 2] = value;
};

/**
 * Box-downscale then nearest-neighbour upscale back to the original size.
 *
 * This is the low-resolution artifact proper: detail below the sample grid is
 * averaged away and cannot be recovered, and the nearest-neighbour return trip
 * leaves the hard blocky edges a rescaled scan shows. Returning to the original
 * page size is deliberate — every class must present the same pixel dimensions
 * so no model can infer the class from the image geometry.
 */
export const resample = (
  pixels: Buffer,
  width: number,
  height: number,
  factor: number,
): void => {
  if (factor <= 1) return;
  const smallWidth = Math.max(1, Math.floor(width / factor));
  const smallHeight = Math.max(1, Math.floor(height / factor));
  const small = new Uint8Array(smallWidth * smallHeight);
  for (let sy = 0; sy < smallHeight; sy += 1) {
    for (let sx = 0; sx < smallWidth; sx += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        const y = sy * factor + dy;
        if (y >= height) break;
        for (let dx = 0; dx < factor; dx += 1) {
          const x = sx * factor + dx;
          if (x >= width) break;
          sum += grey(pixels, width, x, y);
          count += 1;
        }
      }
      small[sy * smallWidth + sx] = count === 0 ? 255 : clampByte(sum / count);
    }
  }
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(smallHeight - 1, Math.floor(y / factor));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(smallWidth - 1, Math.floor(x / factor));
      setGrey(pixels, width, x, y, small[sy * smallWidth + sx] ?? 255);
    }
  }
};

/**
 * Pull every pixel of a block toward that block's mean.
 *
 * This is a cheap stand-in for the ringing and blocking a lossy codec leaves at
 * a low quality setting: the block becomes flatter than the page, and block
 * boundaries become visible where two neighbouring blocks settle on different
 * means. It is not a DCT, and the code does not claim to be one — what it
 * reproduces is the *visible consequence* that makes text hard to segment.
 */
export const blockQuantize = (
  pixels: Buffer,
  width: number,
  height: number,
  blockSize: number,
  strength: number,
): void => {
  if (blockSize <= 1 || strength <= 0) return;
  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let sum = 0;
      let count = 0;
      for (let y = by; y < Math.min(by + blockSize, height); y += 1) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x += 1) {
          sum += grey(pixels, width, x, y);
          count += 1;
        }
      }
      if (count === 0) continue;
      const mean = sum / count;
      for (let y = by; y < Math.min(by + blockSize, height); y += 1) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x += 1) {
          const value = grey(pixels, width, x, y);
          setGrey(
            pixels,
            width,
            x,
            y,
            clampByte(value + (mean - value) * strength),
          );
        }
      }
    }
  }
};

/** Reduce the page to `levels` distinct greys — a low-bit-depth scan. */
export const toneQuantize = (
  pixels: Buffer,
  width: number,
  height: number,
  levels: number,
): void => {
  if (levels >= 256 || levels < 2) return;
  const step = 255 / (levels - 1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = grey(pixels, width, x, y);
      setGrey(pixels, width, x, y, clampByte(Math.round(value / step) * step));
    }
  }
};

/**
 * Sensor speckle: isolated pixels pushed light or dark.
 *
 * Applied last because a real scanner adds it after every optical and
 * compression stage; applying it earlier would let the block step average it
 * away, which is the opposite of what it is for.
 */
export const speckle = (
  pixels: Buffer,
  width: number,
  height: number,
  probability: number,
  magnitude: number,
  rng: () => number,
): void => {
  if (probability <= 0 || magnitude <= 0) return;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rng() >= probability) continue;
      const direction = rng() < 0.5 ? -1 : 1;
      const amount = Math.round(rng() * magnitude) * direction;
      setGrey(
        pixels,
        width,
        x,
        y,
        clampByte(grey(pixels, width, x, y) + amount),
      );
    }
  }
};

/** Apply a whole profile, in the fixed order documented at the top of the file. */
export const applyDegradation = (
  pixels: Buffer,
  width: number,
  height: number,
  profile: DegradationProfile,
): void => {
  resample(pixels, width, height, profile.downscaleFactor);
  blockQuantize(
    pixels,
    width,
    height,
    profile.blockSize,
    profile.blockStrength,
  );
  toneQuantize(pixels, width, height, profile.toneLevels);
  speckle(
    pixels,
    width,
    height,
    profile.speckleProbability,
    profile.speckleMagnitude,
    createRng(profile.seed),
  );
};
