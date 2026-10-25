import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import { beginExecution, completeExecution } from "./versioned-result.js";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function destination() {
  const dir = await mkdtemp(join(tmpdir(), "execution-test-"));
  dirs.push(dir);
  return join(dir, "result.json");
}

it("rejects old completion after the newer result is published, byte for byte", async () => {
  const output = await destination();
  const older = await beginExecution(output);
  const newer = await beginExecution(output);
  expect(newer.version).toBe(older.version + 1);
  expect(newer.runId).not.toBe(older.runId);
  const result = await completeExecution(output, newer, { runs: ["new"] });
  expect(result.execution).toEqual(newer);
  const bytes = await readFile(output, "utf8");
  await expect(
    completeExecution(output, older, { runs: ["old"] }),
  ).rejects.toMatchObject({ code: "STALE-EXECUTION" });
  expect(await readFile(output, "utf8")).toBe(bytes);
});

it("fences old runs as soon as a newer run starts, even if it never completes", async () => {
  const output = await destination();
  await writeFile(output, '{"legacy":true}\n');
  const old = await beginExecution(output);
  await beginExecution(output);
  await expect(completeExecution(output, old, {})).rejects.toThrow(
    "STALE-EXECUTION",
  );
  expect(await readFile(output, "utf8")).toBe('{"legacy":true}\n');
});

it("requires both identity and version and rejects repeated completion", async () => {
  const output = await destination();
  const execution = await beginExecution(output);
  for (const token of [
    { ...execution, runId: "other" },
    { ...execution, version: 0 },
  ]) {
    await expect(completeExecution(output, token, {})).rejects.toThrow(
      "STALE-EXECUTION",
    );
  }
  await completeExecution(output, execution, {});
  await expect(completeExecution(output, execution, {})).rejects.toThrow(
    "STALE-EXECUTION",
  );
});

it("keeps independent destinations independent and upgrades legacy output", async () => {
  const output = await destination();
  const other = await destination();
  await writeFile(output, '{"schemaVersion":1}');
  const [a, b] = await Promise.all([
    beginExecution(output),
    beginExecution(other),
  ]);
  expect(a.version).toBe(1);
  expect(b.version).toBe(1);
  await Promise.all([
    completeExecution(output, a, { schemaVersion: 1 }),
    completeExecution(other, b, {}),
  ]);
  expect(JSON.parse(await readFile(output, "utf8"))).toEqual({
    schemaVersion: 1,
    execution: a,
  });
});

it("fails closed on malformed state and releases the lock", async () => {
  const output = await destination();
  await writeFile(output, "old bytes");
  for (const state of [
    "{",
    "null",
    '{"runId":"a","version":-1,"completed":false}',
  ]) {
    await writeFile(`${output}.execution.json`, state);
    await expect(beginExecution(output)).rejects.toThrow();
    expect(await readFile(output, "utf8")).toBe("old bytes");
    expect(await readdir(dirs[0])).not.toContain("result.json.execution.lock");
  }
});

it("preserves bytes and allows retry after serialization fails", async () => {
  const output = await destination();
  await writeFile(output, "previous");
  const execution = await beginExecution(output);
  const circular: { self?: unknown } = {};
  circular.self = circular;
  await expect(
    completeExecution(output, execution, circular),
  ).rejects.toThrow();
  expect(await readFile(output, "utf8")).toBe("previous");
  await completeExecution(output, execution, { ok: true });
});

it("shares reservations through directory symlinks", async () => {
  const output = await destination();
  const alias = join(dirs[0], "alias");
  await symlink(dirs[0], alias, "dir");
  const old = await beginExecution(output);
  const current = await beginExecution(join(alias, "result.json"));
  expect(current.version).toBe(2);
  await expect(completeExecution(output, old, {})).rejects.toThrow(
    "STALE-EXECUTION",
  );
});

it("serializes reservations from separate Node processes", async () => {
  const output = await destination();
  const moduleUrl = new URL("./versioned-result.ts", import.meta.url).href;
  const script = `import { beginExecution } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(await beginExecution(process.argv[1])));`;
  const executions = await Promise.all(
    Array.from({ length: 4 }, async () => {
      const { stdout } = await promisify(execFile)(process.execPath, [
        "--import",
        "tsx/esm",
        "--input-type=module",
        "-e",
        script,
        output,
      ]);
      return JSON.parse(stdout);
    }),
  );
  expect(executions.map((e) => e.version).sort()).toEqual([1, 2, 3, 4]);
  expect(new Set(executions.map((e) => e.runId)).size).toBe(4);
  for (const execution of executions.filter((e) => e.version < 4)) {
    await expect(completeExecution(output, execution, {})).rejects.toThrow(
      "STALE-EXECUTION",
    );
  }
  await completeExecution(
    output,
    executions.find((e) => e.version === 4),
    {},
  );
});
