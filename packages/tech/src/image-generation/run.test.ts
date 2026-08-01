import { access, mkdtemp } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runImageGeneration } from "./run";
import { IMAGE_DIR_NAME } from "./domain/image-store";

/**
 * The image-persistence contract, exercised on the keyless fixture client (which
 * returns a committed 1x1 PNG) so it runs without any API key or cost. Handing
 * the runner a `persistImagesDir` drives the same persistence code path a real
 * run uses: each practical-category call record must gain imagePath, imageSha256
 * and imageByteLength, and the referenced file must exist on disk. Mechanical
 * probes are not persisted (bounded frame growth), and a run WITHOUT a directory
 * writes no imagePath at all — the byte-stable fixture guarantee.
 */

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

describe("runImageGeneration image persistence", () => {
  it("records path/sha/bytes for practical-category calls when a dir is given", async () => {
    const dir = await mkdtemp(join(tmpdir(), "run-imgs-"));
    const result = await runImageGeneration({
      fixture: true,
      trials: 1,
      modelIds: ["grok-imagine-image"],
      persistImagesDir: dir,
    });
    const calls = result.runs.flatMap((run) => run.calls);
    const practical = calls.filter((call) => call.category !== "mechanical");
    const mechanical = calls.filter((call) => call.category === "mechanical");

    expect(practical.length).toBeGreaterThan(0);
    for (const call of practical) {
      expect(call.imagePath, call.promptId).toMatch(
        new RegExp(`^${IMAGE_DIR_NAME}/`),
      );
      expect(call.imageSha256, call.promptId).toMatch(/^[0-9a-f]{64}$/);
      expect(call.imageByteLength, call.promptId).toBeGreaterThan(0);
      const fileName = (call.imagePath as string).slice(
        IMAGE_DIR_NAME.length + 1,
      );
      expect(await fileExists(join(dir, fileName)), call.promptId).toBe(true);
    }

    // Mechanical probes keep integrity fields but are never persisted.
    for (const call of mechanical) {
      expect(call.imagePath, call.promptId).toBeUndefined();
      expect(call.imageSha256, call.promptId).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("writes no imagePath when no directory is supplied", async () => {
    const result = await runImageGeneration({
      fixture: true,
      trials: 1,
      modelIds: ["grok-imagine-image"],
    });
    for (const call of result.runs.flatMap((run) => run.calls)) {
      expect(call.imagePath, call.promptId).toBeUndefined();
    }
  });
});
