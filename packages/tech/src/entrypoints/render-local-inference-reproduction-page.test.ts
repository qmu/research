import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "./render-local-inference-reproduction-page";

let dir: string;
let originalArgv: string[];

beforeEach(async () => {
  originalArgv = process.argv;
  dir = await mkdtemp(
    join(tmpdir(), "render-local-inference-reproduction-page-"),
  );
});

afterEach(async () => {
  process.argv = originalArgv;
  await rm(dir, { recursive: true, force: true });
});

const validFile = {
  schemaVersion: 1,
  rows: [
    {
      engine: "vllm",
      model: "llama-3.1-8b-instruct",
      fixture: "fixture-2026-08-01",
      runnerVersion: "runner-1.4.0",
      targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
      verdict: "adopted",
    },
  ],
};

describe("render-local-inference-reproduction-page main()", () => {
  it("reads the input JSON and writes the rendered adoption page", async () => {
    const inputPath = join(dir, "rows.json");
    const outputPath = join(dir, "local-inference-adoption.md");
    await writeFile(inputPath, JSON.stringify(validFile), "utf8");

    process.argv = [
      "node",
      "render-local-inference-reproduction-page.ts",
      inputPath,
      outputPath,
    ];
    await main();

    const written = await readFile(outputPath, "utf8");
    expect(written).toContain("# Local inference adoption");
    expect(written).toContain("lirid-v1-");
    expect(written).toContain("npm run local-inference -- --engine");
    expect(written).toContain("--reproduction-id");
  });

  it("throws without writing anything when the input JSON is invalid", async () => {
    const inputPath = join(dir, "rows.json");
    const outputPath = join(dir, "local-inference-adoption.md");
    await writeFile(
      inputPath,
      JSON.stringify({ ...validFile, schemaVersion: 2 }),
      "utf8",
    );

    process.argv = [
      "node",
      "render-local-inference-reproduction-page.ts",
      inputPath,
      outputPath,
    ];
    await expect(main()).rejects.toThrow(/unsupported schemaVersion/);
    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
  });

  it("throws on a missing argument", async () => {
    process.argv = [
      "node",
      "render-local-inference-reproduction-page.ts",
      join(dir, "rows.json"),
    ];
    await expect(main()).rejects.toThrow(/usage:/);
  });
});
