import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("CLI saves child status and returns distinct measurement/save errors", async () => {
  const dir = await mkdtemp(join(tmpdir(), "measurement-cli-"));
  try {
    const path = join(dir, "result.json");
    const invoke = (engine: string, exit: number) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/measure-local-process.ts",
          engine,
          path,
          "5000",
          process.execPath,
          "-e",
          `process.exit(${exit})`,
        ],
        { encoding: "utf8" },
      );
    expect(invoke("invalid", 0).status).toBe(2);
    expect(invoke("mlx", 7).status).toBe(1);
    const saved = JSON.parse(await readFile(path, "utf8"));
    expect(saved.process.exit_code).toBe(7);
    expect(saved.execution).toEqual({ runId: expect.any(String), version: 1 });
    // A later invocation on the same path reserves the next version and
    // publishes through the same atomic save, replacing the prior evidence.
    expect(invoke("ollama", 0).status).toBe(0);
    const replaced = JSON.parse(await readFile(path, "utf8"));
    expect(replaced.process.exit_code).toBe(0);
    expect(replaced.failure).toBeNull();
    expect(replaced.execution.version).toBe(2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 15000);
