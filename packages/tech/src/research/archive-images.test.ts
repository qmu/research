import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archiveReportFrame } from "./archive-runner";

/**
 * End-to-end proof that research:archive moves a real run's generated images
 * into the dated frame's images/ directory (Quality Gate: "Image persistence
 * contract"). The archive runner resolves the repo root from the process cwd,
 * so the test builds a throwaway repo layout and points cwd at its packages/tech
 * before calling archiveReportFrame, restoring cwd afterwards.
 */

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

describe("archiveReportFrame image move", () => {
  it("moves the real images into the frame's images/ directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "archive-imgs-"));
    const reports = join(root, "docs", "research-reports");
    await mkdir(join(root, "packages", "tech"), { recursive: true });
    await mkdir(reports, { recursive: true });
    // A minimal current report and a real-run images directory beside it.
    await writeFile(
      join(reports, "image-generation-comparison.md"),
      "# report\n",
    );
    const realImages = join(reports, "image-generation-comparison.real.images");
    await mkdir(realImages, { recursive: true });
    await writeFile(
      join(realImages, "grok-imagine-image--photo-red-apple--r0.png"),
      Buffer.from([137, 80, 78, 71]),
    );

    process.chdir(join(root, "packages", "tech"));
    const written = await archiveReportFrame({
      topicId: "image-generation",
      generatedAt: "2026-08-01T00:00:00.000Z",
    });

    const frameImage = join(
      reports,
      "history",
      "image-generation",
      "2026-08-01T00-00-00-000Z",
      "images",
      "grok-imagine-image--photo-red-apple--r0.png",
    );
    expect(await fileExists(frameImage)).toBe(true);
    expect(
      written.some((path) => path.endsWith("/images")),
      written.join(", "),
    ).toBe(true);
  });
});
