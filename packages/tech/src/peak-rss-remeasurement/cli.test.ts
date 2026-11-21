import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

const source = {
  runId: "example-run",
  engine: "mlx",
  model: "example-model",
  fixture: "example-fixture-v1",
  runnerVersion: "example-runner-v1",
  targetCommit: "a".repeat(40),
};
let dir: string;
let expected: string;
let snapshot: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "peak-rss-request-"));
  expected = join(dir, "expected.json");
  snapshot = join(dir, "snapshot.json");
  await writeFile(expected, JSON.stringify(source));
  await writeFile(
    snapshot,
    JSON.stringify({
      source,
      metrics: { peak_rss: { value: null, unit: "MiB", reason: "NO-FIELD" } },
    }),
  );
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
const run = (args: string[]) =>
  spawnSync(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "src/entrypoints/prepare-peak-rss-remeasurement.ts",
      ...args,
    ],
    { encoding: "utf8" },
  );

it("outputs a pinned request with status 2 and preserves inputs", async () => {
  const before = await readFile(snapshot, "utf8");
  const result = run([expected, snapshot]);
  expect(result.status).toBe(2);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({
    source,
    reason: "NO-FIELD",
    requiresNewArtifact: true,
  });
  expect(await readFile(snapshot, "utf8")).toBe(before);
});
it("returns null with status 0 for a measurement", async () => {
  await writeFile(
    snapshot,
    JSON.stringify({
      source,
      metrics: { peak_rss: { value: 1024, unit: "MiB" } },
    }),
  );
  const result = run([expected, snapshot]);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("null\n");
});
it.each(["missing", "json", "mismatch", "extra-arg"])(
  "rejects %s without leaking source data",
  async (mode) => {
    if (mode === "json") await writeFile(snapshot, "private diagnostic");
    if (mode === "mismatch")
      await writeFile(
        expected,
        JSON.stringify({ ...source, fixture: "other-fixture" }),
      );
    const args = [
      expected,
      mode === "missing" ? join(dir, "private-path") : snapshot,
    ];
    if (mode === "extra-arg") args.push("private-argument");
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("PEAK-RSS-REQUEST-REJECTED\n");
  },
);
