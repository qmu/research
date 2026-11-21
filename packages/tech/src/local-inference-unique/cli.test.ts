import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("CLI rejects duplicate files privately and preserves source bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "inference-unique-"));
  const file = join(dir, "private-path.json");
  const input = JSON.stringify({
    schemaVersion: 1,
    execution: { runId: "private-id", version: 1 },
    runs: [{ engine: "mlx" }],
  });
  const invoke = (...paths: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/preflight-unique-local-inference.ts",
        ...paths,
      ],
      { encoding: "utf8" },
    );
  try {
    writeFileSync(file, input);
    expect(invoke(file).stdout).toBe("UNIQUE-INFERENCE-ROWS\n");
    const duplicate = invoke(file, file);
    expect(duplicate.status).toBe(1);
    expect(duplicate.stdout).toBe("");
    expect(duplicate.stderr).toBe("DUPLICATE-INFERENCE-ROW\n");
    expect(readFileSync(file, "utf8")).toBe(input);
    writeFileSync(file, "private invalid JSON");
    for (const result of [
      invoke(file),
      invoke(),
      invoke(join(dir, "missing")),
    ]) {
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("INVALID-INFERENCE-IDENTITY\n");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
