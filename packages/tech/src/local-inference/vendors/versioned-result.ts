import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rmdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { writeJsonAtomic } from "./atomic-json.js";

export type Execution = { runId: string; version: number };
type State = Execution & { completed: boolean };

export function isStaleExecutionError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "STALE-EXECUTION"
  );
}

// Realpath the parent so relative paths and directory symlinks share a lock.
async function canonical(output: string) {
  return join(await realpath(dirname(resolve(output))), basename(output));
}

async function locked<T>(output: string, action: () => Promise<T>) {
  const lock = `${output}.execution.lock`;
  const deadline = performance.now() + 5_000;
  for (;;) {
    try {
      await mkdir(lock, { mode: 0o700 });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (performance.now() >= deadline)
        throw new Error("OUTPUT-LOCKED: execution lock could not be acquired");
      await setTimeout(10);
    }
  }
  try {
    return await action();
  } finally {
    await rmdir(lock);
  }
}

async function readState(output: string): Promise<State | undefined> {
  let text;
  try {
    text = await readFile(`${output}.execution.json`, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const state = JSON.parse(text) as State;
  if (
    !state ||
    typeof state.runId !== "string" ||
    !state.runId ||
    !Number.isSafeInteger(state.version) ||
    state.version < 1 ||
    typeof state.completed !== "boolean"
  )
    throw new Error("INVALID-EXECUTION-STATE");
  return state;
}

/** Reserve before measurement. Ordering is lock acquisition, never wall time. */
export async function beginExecution(output: string): Promise<Execution> {
  output = await canonical(output);
  return locked(output, async () => {
    const previous = await readState(output);
    const version = (previous?.version ?? 0) + 1;
    if (!Number.isSafeInteger(version))
      throw new Error("EXECUTION-VERSION-LIMIT");
    const execution = { runId: randomUUID(), version };
    await writeJsonAtomic(`${output}.execution.json`, {
      ...execution,
      completed: false,
    });
    return execution;
  });
}

function assertCurrent(current: State | undefined, execution: Execution) {
  if (
    !current ||
    current.completed ||
    current.runId !== execution.runId ||
    current.version !== execution.version
  )
    throw Object.assign(
      new Error("STALE-EXECUTION: execution is no longer current"),
      { code: "STALE-EXECUTION" },
    );
}

/** Advisory preflight; publication must still compare under its own lock. */
export async function assertExecutionCurrent(
  output: string,
  execution: Execution,
): Promise<void> {
  output = await canonical(output);
  await locked(output, async () => {
    assertCurrent(await readState(output), execution);
  });
}

/** Compare and publish under the same cross-process lock (no check/write gap). */
export async function completeExecution<T extends object>(
  output: string,
  execution: Execution,
  value: T,
) {
  output = await canonical(output);
  return locked(output, async () => {
    const current = await readState(output);
    assertCurrent(current, execution);
    const result = { ...value, execution: { ...execution } };
    await writeJsonAtomic(output, result);
    await writeJsonAtomic(`${output}.execution.json`, {
      ...current,
      completed: true,
    });
    return result;
  });
}
