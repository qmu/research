import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() =>
  directories
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);
const commit = "a".repeat(40);
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "inference-export-test-"));
  directories.push(dir);
  const input = join(dir, "input.json");
  const output = join(dir, "output.json");
  const text =
    JSON.stringify(
      {
        execution: {
          runId: "run-1",
          targetCommit: commit,
          runnerVersion: "local-inference/4",
        },
        runs: [],
      },
      null,
      2,
    ) + "\n";
  writeFileSync(input, text);
  return { dir, input, output, text };
}
function run(args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "src/entrypoints/export-local-inference.ts",
      ...args,
    ],
    { encoding: "utf8" },
  );
}
it("exports the exact verified bytes and removes staging files", () => {
  const f = fixture();
  const result = run([f.input, f.output, "run-1", commit, "local-inference/4"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(readFileSync(f.output, "utf8")).toBe(f.text);
  expect(readFileSync(f.input, "utf8")).toBe(f.text);
  expect(readdirSync(f.dir).sort()).toEqual(["input.json", "output.json"]);
});
it.each([
  ["wrong-run", commit, "local-inference/4"],
  ["run-1", "b".repeat(40), "local-inference/4"],
  ["run-1", commit, "local-inference/3"],
  ["run-1", commit, "local-inference/999"],
  ["run-1", "", "local-inference/4"],
])("rejects identity %s without creating output", (...identity) => {
  const f = fixture();
  const result = run([f.input, f.output, ...identity]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("EXPORT-SNAPSHOT-REJECTED\n");
  expect(readdirSync(f.dir)).toEqual(["input.json"]);
  expect(readFileSync(f.input, "utf8")).toBe(f.text);
});
it.each(["existing", "source", "symlink"])(
  "preserves %s destination and cleans staging",
  (kind) => {
    const f = fixture();
    const destination = kind === "source" ? f.input : f.output;
    if (kind === "existing") writeFileSync(destination, "keep");
    if (kind === "symlink") symlinkSync(f.input, destination);
    const result = run([
      f.input,
      destination,
      "run-1",
      commit,
      "local-inference/4",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("EXPORT-SNAPSHOT-REJECTED\n");
    expect(readFileSync(destination, "utf8")).toBe(
      kind === "existing" ? "keep" : f.text,
    );
    expect(readFileSync(f.input, "utf8")).toBe(f.text);
    expect(
      readdirSync(f.dir).some((name) => name.startsWith(".inference-export-")),
    ).toBe(false);
  },
);
it.each(["malformed", "missing", "extra-argument"])(
  "rejects %s with no destination",
  (kind) => {
    const f = fixture();
    if (kind === "malformed")
      writeFileSync(f.input, "private malformed content");
    const args = [
      kind === "missing" ? join(f.dir, "private-missing.json") : f.input,
      f.output,
      "run-1",
      commit,
      "local-inference/4",
    ];
    if (kind === "extra-argument") args.push("extra");
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("EXPORT-SNAPSHOT-REJECTED\n");
    expect(readdirSync(f.dir)).toEqual(["input.json"]);
  },
);
