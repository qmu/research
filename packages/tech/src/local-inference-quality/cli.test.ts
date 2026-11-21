import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { sha256 } from "./domain/quality.js";

it("CLI saves judgments, refuses overwrite and rejects stale evidence before writing", async () => {
  const directory = await mkdtemp(join(tmpdir(), "quality-integration-"));
  try {
    const source = JSON.stringify({
      schemaVersion: 1,
      inputSha256: sha256("prompt"),
      runs: [
        { engine: "mlx", model: "synthetic", status: "measured", metrics: {} },
      ],
    });
    const paths = [
      "source.json",
      "fixtures.json",
      "evidence.json",
      "result.json",
    ].map((name) => join(directory, name));
    await writeFile(paths[0], source);
    await writeFile(
      paths[1],
      JSON.stringify([
        { id: "fixed-v1", inputSha256: sha256("prompt"), expected: "yes" },
      ]),
    );
    await writeFile(
      paths[2],
      JSON.stringify({
        sourceSha256: sha256(source),
        outputs: [{ runIndex: 0, fixtureId: "fixed-v1", text: "yes" }],
      }),
    );
    const run = (args = paths) =>
      spawnSync(
        process.execPath,
        [
          "--import",
          "tsx/esm",
          "src/entrypoints/enrich-local-inference-quality.ts",
          ...args,
        ],
        { encoding: "utf8" },
      );
    expect(run().status).toBe(0);
    const saved = await readFile(paths[3], "utf8");
    expect(JSON.parse(saved).runs[0].quality[0].verdict).toBe("pass");
    expect(run().status).toBe(1);
    expect(await readFile(paths[3], "utf8")).toBe(saved);
    await writeFile(paths[0], source + "\n");
    const bad = run([...paths.slice(0, 3), join(directory, "invalid.json")]);
    expect(bad.status).toBe(1);
    expect(bad.stderr).not.toContain(directory);
    await expect(readFile(join(directory, "invalid.json"))).rejects.toThrow();
    expect(run([]).status).toBe(1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("reproduces committed synthetic fixture with all four verdict paths", async () => {
  const { enrichQuality } = await import("./domain/quality.js");
  const base = "src/local-inference-quality/fixtures/";
  const messages = JSON.parse(await readFile(base + "messages.json", "utf8"));
  const fixtures = JSON.parse(await readFile(base + "fixtures.json", "utf8"));
  expect(fixtures[0].inputSha256).toBe(sha256(JSON.stringify(messages)));
  const result = enrichQuality(
    await readFile(base + "result.json", "utf8"),
    fixtures,
    JSON.parse(await readFile(base + "evidence.json", "utf8")),
  );
  expect(
    result.runs.map((run) => [
      run.engine,
      run.quality[0].verdict,
      run.quality[0].reason,
    ]),
  ).toEqual([
    ["ollama", "pass", null],
    ["llama.cpp", "fail", null],
    ["mlx", "undetermined", "NO-OUTPUT"],
    ["strata", "undetermined", "MEASURE-FAILED"],
  ]);
});
