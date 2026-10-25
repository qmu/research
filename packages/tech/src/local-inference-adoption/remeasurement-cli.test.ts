import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("prepares only the exact snapshot binding and never rewrites the input", () => {
  const dir = mkdtempSync(join(tmpdir(), "remeasurement-"));
  try {
    const data = JSON.parse(
      readFileSync(
        "src/local-inference-adoption/fixtures/baseline.json",
        "utf8",
      ),
    );
    data.execution.runId = "snapshot-one";
    data.privateCommand = "private-marker";
    const original = JSON.stringify(data);
    const input = join(dir, "saved.json");
    writeFileSync(input, original);
    const cli = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/prepare-local-inference-remeasurement.ts",
          ...args,
        ],
        { encoding: "utf8" },
      );
    const args = [
      data.execution.runId,
      data.execution.targetCommit,
      data.execution.runnerVersion,
      input,
    ];
    const valid = cli(...args);
    expect(valid.status).toBe(0);
    expect(JSON.parse(valid.stdout)).toEqual({
      source: data.execution,
      requiresNewExecutionId: true,
    });
    expect(valid.stdout).not.toContain("private-marker");
    expect(readFileSync(input, "utf8")).toBe(original);
    for (const index of [0, 1, 2]) {
      const changed = [...args];
      changed[index] =
        index === 1
          ? "2".repeat(40)
          : index === 2
            ? "local-inference/3"
            : "snapshot-two";
      const blocked = cli(...changed);
      expect(blocked.status).toBe(1);
      expect(blocked.stdout).toBe("");
      expect(blocked.stderr).not.toContain(dir);
      expect(readFileSync(input, "utf8")).toBe(original);
    }
    expect(cli(...args, "extra").status).toBe(1);
    writeFileSync(input, '{"private-marker":');
    const invalid = cli(...args);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).not.toContain("private-marker");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
