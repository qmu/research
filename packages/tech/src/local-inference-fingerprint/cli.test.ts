import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

const source = JSON.stringify({
  schemaVersion: 1,
  inputSha256: "a".repeat(64),
  runs: [
    { engine: "mlx", model: "synthetic", status: "measured", metrics: {} },
  ],
});

const run = (args: string[]) =>
  spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "src/entrypoints/enrich-local-inference-fingerprint.ts",
      ...args,
    ],
    { encoding: "utf8" },
  );

it("CLI saves a host fingerprint and refuses to overwrite the output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fingerprint-cli-"));
  try {
    const input = join(directory, "result.json");
    const output = join(directory, "new-result.json");
    await writeFile(input, source);

    expect(run([input, output]).status).toBe(0);
    const saved = JSON.parse(await readFile(output, "utf8"));
    expect(Object.keys(saved.fingerprint).sort()).toEqual([
      "arch",
      "engineVersion",
      "os",
      "totalMemoryMiB",
    ]);
    expect(saved.runs).toEqual(JSON.parse(source).runs);

    expect(run([input, output]).status).toBe(1);
    expect(await readFile(output, "utf8")).toBe(
      JSON.stringify(saved, null, 2) + "\n",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rejects malformed input without creating the output or leaking the path", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fingerprint-cli-bad-"));
  try {
    const input = join(directory, "result.json");
    const output = join(directory, "new-result.json");
    await writeFile(input, JSON.stringify({ schemaVersion: 2, runs: [] }));

    const result = run([input, output]);
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain(directory);
    await expect(readFile(output)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rejects the wrong number of arguments", () => {
  expect(run([]).status).toBe(1);
  expect(run(["only-one-arg"]).status).toBe(1);
});
