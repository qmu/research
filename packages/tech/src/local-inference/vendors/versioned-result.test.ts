import { execFile, spawn } from "node:child_process";
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
import { withRunningLock } from "./running-lock.js";
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

for (const [deadlineAt, decision] of [
  [0, "expired"],
  [Number.MAX_SAFE_INTEGER, "not-expired"],
  [undefined, "unknown"],
] as const) {
  it(`atomically records ${decision} abandoned owner evidence before new work`, async () => {
    const output = await destination();
    const old = await beginExecution(output);
    await writeFile(
      output,
      JSON.stringify({ schemaVersion: 1, runs: ["retained"] }),
    );
    await writeFile(
      `${output}.execution.json`,
      JSON.stringify({
        ...old,
        completed: false,
        deadlineAt,
        secret: "must-not-copy",
      }),
    );
    await withRunningLock(output, async () => {
      const current = await beginExecution(output, { timeoutMs: 1000 });
      const recovered = JSON.parse(await readFile(output, "utf8"));
      expect(recovered.runs).toEqual(["retained"]);
      expect(recovered.lockRecovery).toEqual({
        ownerRunId: old.runId,
        deadlineAt: deadlineAt ?? null,
        checkedAt: expect.any(Number),
        deadlineDecision: decision,
        reason: "owner-lock-released",
      });
      expect(JSON.stringify(recovered)).not.toContain("must-not-copy");
      await expect(completeExecution(output, old, {})).rejects.toThrow(
        "STALE-EXECUTION",
      );
      const completed = await completeExecution(output, current, {
        runs: ["new"],
      });
      expect(completed.lockRecovery).toEqual(recovered.lockRecovery);
    });
    expect((await readdir(dirs[0])).filter((f) => f.endsWith(".tmp"))).toEqual(
      [],
    );
  });
}

it("does not create a recovery for a completed owner and rejects unsafe legacy IDs", async () => {
  const output = await destination();
  const old = await beginExecution(output);
  await completeExecution(output, old, {});
  const current = await beginExecution(output, { timeoutMs: 1000 });
  expect(
    JSON.parse(await readFile(output, "utf8")).lockRecovery,
  ).toBeUndefined();
  await writeFile(
    `${output}.execution.json`,
    JSON.stringify({ ...current, runId: "secret-endpoint", completed: false }),
  );
  await withRunningLock(output, () =>
    beginExecution(output, { timeoutMs: 1000 }),
  );
  expect(
    JSON.parse(await readFile(output, "utf8")).lockRecovery.ownerRunId,
  ).toBeNull();
  expect(await readFile(output, "utf8")).not.toContain("secret-endpoint");
});

it("fails before replacing the reservation when recovery JSON cannot be read", async () => {
  const output = await destination();
  await beginExecution(output);
  const state = await readFile(`${output}.execution.json`, "utf8");
  await writeFile(output, "malformed");
  await expect(
    withRunningLock(output, () => beginExecution(output, { timeoutMs: 1000 })),
  ).rejects.toThrow();
  expect(await readFile(output, "utf8")).toBe("malformed");
  expect(await readFile(`${output}.execution.json`, "utf8")).toBe(state);
});

it("does not steal an expired live owner's lock and records recovery after SIGKILL", async () => {
  const output = await destination();
  const lockUrl = new URL("./running-lock.ts", import.meta.url).href;
  const stateUrl = new URL("./versioned-result.ts", import.meta.url).href;
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx/esm",
      "--input-type=module",
      "-e",
      `import { withRunningLock } from ${JSON.stringify(lockUrl)}; import { beginExecution } from ${JSON.stringify(stateUrl)}; await withRunningLock(process.argv[1], async () => { console.log(JSON.stringify(await beginExecution(process.argv[1], { timeoutMs: 1 }))); setInterval(() => {}, 1000); await new Promise(() => {}); });`,
      output,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  try {
    const owner = await new Promise<{ runId: string }>((resolve, reject) => {
      child.stdout.once("data", (b) => resolve(JSON.parse(b.toString())));
      child.once("exit", () => reject(new Error("owner exited early")));
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const state = await readFile(`${output}.execution.json`, "utf8");
    await expect(
      withRunningLock(output, () =>
        beginExecution(output, { timeoutMs: 1000 }),
      ),
    ).rejects.toThrow("OUTPUT-RUNNING");
    expect(await readFile(`${output}.execution.json`, "utf8")).toBe(state);
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGKILL");
    await exited;
    await withRunningLock(output, () =>
      beginExecution(output, { timeoutMs: 1000 }),
    );
    const record = JSON.parse(await readFile(output, "utf8")).lockRecovery;
    expect(record.ownerRunId).toBe(owner.runId);
    expect(record.deadlineDecision).toBe("expired");
  } finally {
    child.kill("SIGKILL");
  }
});
