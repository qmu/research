import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("CLI emits only complete validated batches or fixed reasons, without changing inputs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "engine-guard-"));
  const definition = join(dir, "runner.json");
  const artifact = join(dir, "artifact.json");
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/publish-known-engine-adoption.ts",
        ...args,
      ],
      { encoding: "utf8" },
    );
  try {
    await writeFile(definition, JSON.stringify({ engines: ["mlx"] }));
    const good = [{ engine: "mlx", adopted: true, metric: 42 }];
    await writeFile(artifact, JSON.stringify(good));
    const success = run(definition, artifact);
    expect(success.status).toBe(0);
    expect(success.stderr).toBe("");
    expect(JSON.parse(success.stdout)).toEqual(good);
    for (const [input, reason] of [
      [
        JSON.stringify([...good, { engine: "private-marker" }]),
        "UNKNOWN-ADOPTION-ENGINE",
      ],
      [JSON.stringify([...good, { engine: null }]), "INVALID-ADOPTION-ENGINE"],
      ["private-invalid-json", "INVALID-ADOPTION-ENGINE"],
    ] as const) {
      await writeFile(artifact, input);
      const failure = run(definition, artifact);
      expect(failure.status).toBe(1);
      expect(failure.stdout).toBe("");
      expect(failure.stderr).toBe(`${reason}\n`);
      expect(await readFile(artifact, "utf8")).toBe(input);
    }
    await writeFile(artifact, JSON.stringify(good));
    await writeFile(definition, "private-invalid-runner");
    for (const path of [definition, join(dir, "private-missing-path")]) {
      const failure = run(path, artifact);
      expect(failure.status).toBe(1);
      expect(failure.stdout).toBe("");
      expect(failure.stderr).toBe("INVALID-RUNNER-DEFINITION\n");
    }
    const args = run();
    expect(args.status).toBe(1);
    expect(args.stdout).toBe("");
    expect(args.stderr).toBe("INVALID-ENGINE-GUARD-ARGUMENTS\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
