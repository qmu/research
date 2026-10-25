import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "./render-local-inference";

let dir: string;
let originalArgv: string[];

beforeEach(async () => {
  originalArgv = process.argv;
  dir = await mkdtemp(join(tmpdir(), "render-local-inference-"));
});

afterEach(async () => {
  process.argv = originalArgv;
  await rm(dir, { recursive: true, force: true });
});

const fingerprint = `sha256:${"0123456789abcdef".repeat(4)}`;

const validFile = {
  schemaVersion: 1,
  fixture: true,
  runs: [
    {
      id: "ollama-1",
      backend: "ollama",
      modelCondition: {
        model: "llama-3.1-8b-instruct",
        quantization: "Q4_K_M",
        condition: "ctx=4096, temp=0.2, seed=7",
      },
      runner: { name: "ollama", version: "0.4.7" },
      commandFingerprint: fingerprint,
    },
  ],
};

describe("render-local-inference main()", () => {
  it("reads the input JSON and writes the rendered comparison page", async () => {
    const inputPath = join(dir, "comparison.json");
    const outputPath = join(dir, "local-inference-comparison.md");
    await writeFile(inputPath, JSON.stringify(validFile), "utf8");

    process.argv = ["node", "render-local-inference.ts", inputPath, outputPath];
    await main();

    const written = await readFile(outputPath, "utf8");
    expect(written).toContain("# Local inference comparison");
    expect(written).toContain("ollama 0.4.7");
    expect(written).toContain(fingerprint);
  });

  it("throws without writing anything when the input JSON is invalid", async () => {
    const inputPath = join(dir, "comparison.json");
    const outputPath = join(dir, "local-inference-comparison.md");
    await writeFile(
      inputPath,
      JSON.stringify({ ...validFile, schemaVersion: 2 }),
      "utf8",
    );

    process.argv = ["node", "render-local-inference.ts", inputPath, outputPath];
    await expect(main()).rejects.toThrow(/unsupported schemaVersion/);
    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
  });

  it("throws on a missing argument", async () => {
    process.argv = [
      "node",
      "render-local-inference.ts",
      join(dir, "comparison.json"),
    ];
    await expect(main()).rejects.toThrow(/usage:/);
  });
});
