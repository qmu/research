import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "./render-local-inference-adoption";

let dir: string;
let originalArgv: string[];

beforeEach(async () => {
  originalArgv = process.argv;
  dir = await mkdtemp(join(tmpdir(), "render-local-inference-adoption-"));
});

afterEach(async () => {
  process.argv = originalArgv;
  await rm(dir, { recursive: true, force: true });
});

const validFile = {
  schemaVersion: 1,
  snapshots: [
    {
      id: "vllm-8b-fp16",
      engineVersion: "vllm 0.6.3",
      model: "llama-3.1-8b-instruct",
      fixtureVersion: "fixture-2026-08-01",
      runnerVersion: "runner-1.4.0",
      verdict: "adopted",
    },
  ],
};

describe("render-local-inference-adoption main()", () => {
  it("reads the input JSON and writes the rendered adoption page", async () => {
    const inputPath = join(dir, "snapshots.json");
    const outputPath = join(dir, "local-inference-adoption.md");
    await writeFile(inputPath, JSON.stringify(validFile), "utf8");

    process.argv = [
      "node",
      "render-local-inference-adoption.ts",
      inputPath,
      outputPath,
    ];
    await main();

    const written = await readFile(outputPath, "utf8");
    expect(written).toContain("# Local inference adoption");
    expect(written).toContain("vllm-8b-fp16");
    expect(written).toContain("npm run local-inference -- --engine-version");
  });

  it("throws without writing anything when the input JSON is invalid", async () => {
    const inputPath = join(dir, "snapshots.json");
    const outputPath = join(dir, "local-inference-adoption.md");
    await writeFile(
      inputPath,
      JSON.stringify({ ...validFile, schemaVersion: 2 }),
      "utf8",
    );

    process.argv = [
      "node",
      "render-local-inference-adoption.ts",
      inputPath,
      outputPath,
    ];
    await expect(main()).rejects.toThrow(/unsupported schemaVersion/);
    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
  });

  it("throws on a missing argument", async () => {
    process.argv = [
      "node",
      "render-local-inference-adoption.ts",
      join(dir, "snapshots.json"),
    ];
    await expect(main()).rejects.toThrow(/usage:/);
  });
});
