import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const entrypoint = "src/entrypoints/run-local-inference-process.ts";
it("rejects malformed CLI arguments without echoing them", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx/esm", entrypoint, "private-argument"],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).not.toContain("private-argument");
});
it.skipIf(process.platform === "darwin" && process.arch === "arm64")(
  "persists the unsupported-host reason and exits nonzero",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "rss-cli-"));
    try {
      const output = join(directory, "run.json");
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          entrypoint,
          "mlx",
          output,
          "--",
          "must-not-execute",
        ],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      const saved = JSON.parse(await readFile(output, "utf8"));
      expect(saved.memoryMeasurement.acquisitionReason).toBe(
        "UNSUPPORTED-HOST",
      );
      expect(JSON.parse(result.stdout)).toEqual(saved);
      expect(JSON.stringify(saved)).not.toContain("must-not-execute");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
