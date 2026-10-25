import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { runStrataExecutor, saveStrataRun } from "./strata-executor";

const identity = {
  model: "qwen3.8-flash-next-iq3_s",
  runtimeVersion: "strata-0.0.0",
  condition: { pack: "IQ3_S" },
};

const validRecord = {
  final_answer: "SECRET-MARKER-should-never-be-saved",
  finish_reason: "stop",
  usage: { completion_tokens: 42 },
  error: null,
  http_status: 200,
  dispatch_offset_s: 0,
  end_offset_s: 2,
};

let dir: string;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

const engineOf = (row: unknown): unknown =>
  typeof row === "object" && row !== null
    ? (row as Record<string, unknown>).engine
    : undefined;

describe("runStrataExecutor", () => {
  it("measures a successful run by reading the outputs file", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-executor-"));
    const outputsPath = join(dir, "outputs.jsonl");
    await writeFile(outputsPath, `${JSON.stringify(validRecord)}\n`, "utf8");

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      timeoutMs: 5000,
      outputsPath,
    });

    expect(run.status).toBe("measured");
    expect(run.exitCode).toBe(0);
    expect(run.metrics.completionTokens).toEqual({
      value: 42,
      unit: "tokens",
      source: "usage",
    });
    expect(JSON.stringify(run)).not.toContain("SECRET-MARKER");
  });

  it("does not read the outputs file after a timeout", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-executor-"));
    const outputsPath = join(dir, "outputs.jsonl");
    // Present but stale — proves the timeout path never looks at it.
    await writeFile(outputsPath, `${JSON.stringify(validRecord)}\n`, "utf8");

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000)"],
      timeoutMs: 150,
      outputsPath,
    });

    expect(run.status).toBe("timeout");
    expect(run.exitCode).toBeNull();
  });

  it("reports exit-failed with the real exit code", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-executor-"));
    const outputsPath = join(dir, "outputs.jsonl");

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(2)"],
      timeoutMs: 5000,
      outputsPath,
    });

    expect(run.status).toBe("exit-failed");
    expect(run.exitCode).toBe(2);
  });

  it("reports invalid-output when exit 0 left no outputs file", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-executor-"));
    const outputsPath = join(dir, "outputs.jsonl");

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      timeoutMs: 5000,
      outputsPath,
    });

    expect(run.status).toBe("invalid-output");
    expect(run.exitCode).toBe(0);
  });
});

describe("saveStrataRun", () => {
  it("writes a fresh common inference JSON when none exists", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-save-"));
    const outputPath = join(dir, "common.json");
    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(2)"],
      timeoutMs: 5000,
      outputsPath: join(dir, "missing.jsonl"),
    });

    const saved = await saveStrataRun(run, outputPath);

    expect(saved.schemaVersion).toBe(1);
    expect(saved.runs).toHaveLength(1);
    expect(saved.runs[0]).toMatchObject({
      engine: "strata",
      status: "exit-failed",
    });
    const onDisk = JSON.parse(await readFile(outputPath, "utf8"));
    expect(onDisk.runs).toHaveLength(1);
  });

  it("keeps other engines' rows and replaces only the strata row", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-save-"));
    const outputPath = join(dir, "common.json");
    await writeFile(
      outputPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-01-01T00:00:00.000Z",
        runs: [
          { engine: "ollama", status: "measured" },
          { engine: "strata", status: "timeout", exitCode: null },
        ],
      }),
      "utf8",
    );

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      timeoutMs: 5000,
      outputsPath: join(dir, "missing.jsonl"),
    });
    const saved = await saveStrataRun(run, outputPath);

    expect(saved.runs).toHaveLength(2);
    const ollamaRow = saved.runs.find((r) => engineOf(r) === "ollama");
    const strataRow = saved.runs.find((r) => engineOf(r) === "strata");
    expect(ollamaRow).toEqual({ engine: "ollama", status: "measured" });
    expect(strataRow).toMatchObject({ status: "invalid-output" });
  });

  it("ignores a malformed existing file instead of throwing", async () => {
    dir = await mkdtemp(join(tmpdir(), "strata-save-"));
    const outputPath = join(dir, "common.json");
    await writeFile(outputPath, "not json", "utf8");

    const run = await runStrataExecutor({
      ...identity,
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      timeoutMs: 5000,
      outputsPath: join(dir, "missing.jsonl"),
    });
    const saved = await saveStrataRun(run, outputPath);

    expect(saved.runs).toHaveLength(1);
  });
});
