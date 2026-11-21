import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  mkdir,
  copyFile,
  writeFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve("scripts/reproduce-fixture.mjs");
test("fixture command saves deterministic JSON/table and the actual exit code", async () => {
  const output = await mkdtemp(resolve(tmpdir(), "research-reproduce-"));
  try {
    const run = () =>
      spawnSync(process.execPath, [script, output], { encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const data = await readFile(
      resolve(output, "rag-benchmark.data.json"),
      "utf8",
    );
    const report = await readFile(resolve(output, "rag-benchmark.md"), "utf8");
    const result = JSON.parse(data);
    assert.equal(result.fixture, true);
    assert.ok(result.runs.length > 1);
    assert.ok(result.runs.every((row) => row.provenance === "fixtured"));
    assert.match(report, /\|.*\|/);
    assert.match(
      await readFile(resolve(output, "command-output.txt"), "utf8"),
      /fixture=true/,
    );
    assert.equal(
      await readFile(resolve(output, "exit-code.txt"), "utf8"),
      "0\n",
    );
    assert.equal(run().status, 0);
    assert.equal(
      await readFile(resolve(output, "rag-benchmark.data.json"), "utf8"),
      data,
    );
    assert.equal(
      await readFile(resolve(output, "rag-benchmark.md"), "utf8"),
      report,
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("failed generator preserves its status and removes stale successful artifacts", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "research-reproduce-fail-"));
  try {
    await mkdir(resolve(root, "scripts"), { recursive: true });
    await mkdir(resolve(root, "packages/tech/src/entrypoints"), {
      recursive: true,
    });
    await copyFile(script, resolve(root, "scripts/reproduce-fixture.mjs"));
    await symlink(
      resolve("packages/tech/node_modules"),
      resolve(root, "packages/tech/node_modules"),
      "dir",
    );
    await writeFile(
      resolve(root, "packages/tech/src/entrypoints/run-rag-benchmark.ts"),
      'console.error("fixture failure"); process.exitCode = 7;',
    );
    const output = resolve(root, "artifacts");
    await mkdir(output);
    for (const name of [
      "rag-benchmark.md",
      "rag-benchmark.data.json",
      "exit-code.txt",
    ]) {
      await writeFile(resolve(output, name), "stale");
    }
    const failed = spawnSync(
      process.execPath,
      [resolve(root, "scripts/reproduce-fixture.mjs"), output],
      { encoding: "utf8" },
    );
    assert.equal(failed.status, 7, failed.stderr);
    assert.equal(
      await readFile(resolve(output, "exit-code.txt"), "utf8"),
      "7\n",
    );
    assert.match(
      await readFile(resolve(output, "command-output.txt"), "utf8"),
      /fixture failure/,
    );
    await assert.rejects(readFile(resolve(output, "rag-benchmark.md")), {
      code: "ENOENT",
    });
    await assert.rejects(readFile(resolve(output, "rag-benchmark.data.json")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
