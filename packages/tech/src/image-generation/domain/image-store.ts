import { createHash } from "node:crypto";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { GeneratedImage } from "../../vendors/llm/types";
import type { ImageGenCallRecord, ImagePrompt } from "./types";

/**
 * Pure and effectful helpers for PERSISTING generated images as part of the
 * accumulating history DB (manifest v2). Persistence is a real-run concern: the
 * keyless fixture path never writes an image, so it stays byte-stable and
 * commits no binaries. Only practical-category prompts are persisted — the
 * `mechanical` shape/text probes are saturated exhibits already summarised by
 * their scores, so skipping them caps how many images each monthly frame adds.
 */

/** The relative directory (under the report / frame dir) images live in. Chosen
 * so the SAME relative reference (`images/<file>`) resolves both inside a dated
 * history frame and on the current published page composed from that frame. */
export const IMAGE_DIR_NAME = "images";

/**
 * Per-image byte budget for the committed history DB. A provider that returns a
 * larger image than this is still persisted (we never silently drop evidence),
 * but the cap is the documented target the report's method section cites, and
 * the runner requests each provider's smallest supported size to stay under it,
 * so growth per monthly frame stays bounded. Kept as data so a test and the
 * report read the same number.
 */
export const IMAGE_BYTE_BUDGET = 512 * 1024;

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** File extension for a generated image's MIME type (default `bin`). */
export const imageExtension = (mimeType: string): string =>
  EXTENSION_BY_MIME[mimeType] ?? "bin";

/** Deterministic, collision-free file name for one generated image: model id,
 * prompt id, and repetition, so a multi-trial run keeps every image. */
export const imageFileName = (
  modelId: string,
  promptId: string,
  repetition: number,
  mimeType: string,
): string =>
  `${modelId}--${promptId}--r${repetition}.${imageExtension(mimeType)}`;

/** Whether a prompt's image should be persisted: practical categories only. */
export const shouldPersistImage = (prompt: ImagePrompt): boolean =>
  prompt.category !== "mechanical";

export type ImageRecordFields = Pick<
  ImageGenCallRecord,
  "imageByteLength" | "imageSha256"
>;

/** Byte length and SHA-256 (hex) of a base64-encoded image — the integrity
 * fields recorded alongside every persisted image. Pure. */
export const imageRecordFields = (base64: string): ImageRecordFields => {
  const bytes = Buffer.from(base64, "base64");
  return {
    imageByteLength: bytes.byteLength,
    imageSha256: createHash("sha256").update(bytes).digest("hex"),
  };
};

export type PersistImageContext = Readonly<{
  /** Absolute directory the image bytes are written into (the report's
   * `images/` sibling). Created on demand. */
  dir: string;
  modelId: string;
}>;

export type PersistedImage = ImageRecordFields &
  Readonly<{
    /** Frame-relative reference (`images/<file>`) recorded in the call record
     * and embedded by the report. */
    imagePath: string;
    imageMimeType: string;
  }>;

/**
 * Write one generated image's bytes into `context.dir` and return the fields the
 * call record carries (relative path, byte length, sha256, MIME type). The path
 * is `images/<file>` so it resolves relative to the report both in the dated
 * frame and on the composed current page.
 */
export const persistGeneratedImage = async (
  image: GeneratedImage,
  prompt: ImagePrompt,
  repetition: number,
  context: PersistImageContext,
): Promise<PersistedImage> => {
  const fileName = imageFileName(
    context.modelId,
    prompt.id,
    repetition,
    image.mimeType,
  );
  await mkdir(context.dir, { recursive: true });
  await writeFile(
    `${context.dir}/${fileName}`,
    Buffer.from(image.base64, "base64"),
  );
  return {
    ...imageRecordFields(image.base64),
    imagePath: `${IMAGE_DIR_NAME}/${fileName}`,
    imageMimeType: image.mimeType,
  };
};

/**
 * Copy an images directory into a destination when the source exists (used by
 * the archive step to move a real run's images into the dated frame, and by the
 * current-page composition to mirror a frame's images beside the current page).
 * Returns true when something was copied. Missing source is a no-op, not an
 * error — a run with no persisted images archives cleanly.
 */
export const copyImageDir = async (
  sourceDir: string,
  destinationDir: string,
): Promise<boolean> => {
  try {
    await cp(sourceDir, destinationDir, { recursive: true });
    return true;
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "ENOENT") return false;
    throw error;
  }
};

/** The `images/` sibling directory name for a report/frame markdown or data
 * path — `<something>/images`. Pure string helper used by the archive and
 * composition wiring. */
export const imagesSiblingOf = (markdownOrDataPath: string): string => {
  const dir = markdownOrDataPath.slice(
    0,
    markdownOrDataPath.length - basename(markdownOrDataPath).length,
  );
  return `${dir}${IMAGE_DIR_NAME}`;
};
