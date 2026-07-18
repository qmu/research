import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { GeneratedImage } from "../../vendors/llm/types";
import { FIXTURE_VISION_IMAGE } from "../../vendors/llm/fixture";
import {
  copyImageDir,
  imageExtension,
  imageFileName,
  imageRecordFields,
  imagesSiblingOf,
  IMAGE_DIR_NAME,
  persistGeneratedImage,
  shouldPersistImage,
} from "./image-store";
import type { ImagePrompt } from "./types";

const practicalPrompt: ImagePrompt = {
  id: "photo-red-apple",
  kind: "adherence",
  category: "photo",
  prompt: "x",
  constraints: [{ id: "c", question: "C?" }],
};

const mechanicalPrompt: ImagePrompt = {
  id: "three-red-circles",
  kind: "adherence",
  category: "mechanical",
  prompt: "x",
  constraints: [{ id: "c", question: "C?" }],
};

const fixtureImage: GeneratedImage = {
  base64: FIXTURE_VISION_IMAGE.base64,
  mimeType: "image/png",
  elapsedMs: 5,
  model: "fixture-image",
};

describe("image-store pure helpers", () => {
  it("maps MIME types to file extensions", () => {
    expect(imageExtension("image/png")).toBe("png");
    expect(imageExtension("image/jpeg")).toBe("jpg");
    expect(imageExtension("image/webp")).toBe("webp");
    expect(imageExtension("application/octet-stream")).toBe("bin");
  });

  it("builds a collision-free file name from model, prompt, repetition", () => {
    expect(
      imageFileName("grok-imagine-image", "photo-red-apple", 2, "image/png"),
    ).toBe("grok-imagine-image--photo-red-apple--r2.png");
  });

  it("persists practical categories only", () => {
    expect(shouldPersistImage(practicalPrompt)).toBe(true);
    expect(shouldPersistImage(mechanicalPrompt)).toBe(false);
  });

  it("computes byte length and sha256 from the base64 image", () => {
    const fields = imageRecordFields(fixtureImage.base64);
    const bytes = Buffer.from(fixtureImage.base64, "base64");
    expect(fields.imageByteLength).toBe(bytes.byteLength);
    expect(fields.imageSha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
  });

  it("derives the images/ sibling of a report or data path", () => {
    expect(
      imagesSiblingOf(
        "docs/research-reports/history/image-generation/2026/image-generation-comparison.md",
      ),
    ).toBe("docs/research-reports/history/image-generation/2026/images");
    expect(imagesSiblingOf("docs/research-reports/x.data.json")).toBe(
      "docs/research-reports/images",
    );
  });
});

describe("persistGeneratedImage", () => {
  it("writes the bytes and records path + sha256 + byte length", async () => {
    const dir = await mkdtemp(join(tmpdir(), "imgstore-"));
    const record = await persistGeneratedImage(
      fixtureImage,
      practicalPrompt,
      0,
      { dir, modelId: "grok-imagine-image" },
    );
    expect(record.imagePath).toBe(
      `${IMAGE_DIR_NAME}/grok-imagine-image--photo-red-apple--r0.png`,
    );
    const bytes = Buffer.from(fixtureImage.base64, "base64");
    expect(record.imageByteLength).toBe(bytes.byteLength);
    expect(record.imageSha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    const onDisk = await readFile(
      join(dir, "grok-imagine-image--photo-red-apple--r0.png"),
    );
    expect(Buffer.compare(onDisk, bytes)).toBe(0);
  });
});

describe("copyImageDir", () => {
  it("copies an images directory and is a no-op when the source is absent", async () => {
    const root = await mkdtemp(join(tmpdir(), "imgcopy-"));
    const src = join(root, "src-images");
    const dest = join(root, "frame", IMAGE_DIR_NAME);
    // Missing source: no-op, returns false.
    expect(await copyImageDir(src, dest)).toBe(false);
    // Populate source, then copy.
    await mkdir(src, { recursive: true });
    await writeFile(join(src, "a.png"), Buffer.from([1, 2, 3]));
    expect(await copyImageDir(src, dest)).toBe(true);
    expect(await readdir(dest)).toEqual(["a.png"]);
  });
});
