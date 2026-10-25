import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reproduce } from "./reproduce-local-inference.mjs";

function temporary(t) {
  const dir = mkdtempSync(join(tmpdir(), "inference-fixture-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("real renderer reproduces shared JSON and the published table byte for byte", (t) => {
  const dir = temporary(t);
  assert.equal(reproduce(dir), 0);
  const json = readFileSync(join(dir, "comparison.json"), "utf8");
  const table = readFileSync(join(dir, "comparison.md"), "utf8");
  assert.equal(JSON.parse(json).fixture, true);
  assert.equal(
    table,
    readFileSync(
      new URL("../docs/local-inference-comparison.md", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(readFileSync(join(dir, "exit-code.txt"), "utf8"), "0\n");
  assert.equal(reproduce(dir), 0);
  assert.equal(readFileSync(join(dir, "comparison.json"), "utf8"), json);
  assert.equal(readFileSync(join(dir, "comparison.md"), "utf8"), table);
});

test("failure saves raw status and diagnostics and removes stale or partial table", (t) => {
  const dir = temporary(t);
  writeFileSync(join(dir, "comparison.md"), "stale success");
  const code = reproduce(dir, (_cmd, args) => {
    writeFileSync(args.at(-1), "partial result");
    return { status: 7, stdout: "attempt\n", stderr: "failed\n" };
  });
  assert.equal(code, 7);
  assert.equal(existsSync(join(dir, "comparison.md")), false);
  assert.equal(readFileSync(join(dir, "exit-code.txt"), "utf8"), "7\n");
  assert.equal(readFileSync(join(dir, "stdout.txt"), "utf8"), "attempt\n");
  assert.equal(readFileSync(join(dir, "stderr.txt"), "utf8"), "failed\n");
});

test("spawn errors and signals produce nonzero saved status", (t) => {
  const dir = temporary(t);
  for (const result of [
    { status: null, error: new Error("spawn unavailable") },
    { status: null, signal: "SIGTERM" },
  ]) {
    assert.equal(
      reproduce(dir, () => result),
      1,
    );
    assert.equal(readFileSync(join(dir, "exit-code.txt"), "utf8"), "1\n");
    assert.match(
      readFileSync(join(dir, "stderr.txt"), "utf8"),
      /spawn unavailable|SIGTERM/,
    );
  }
});
