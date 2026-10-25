import { recoveryRecord, type LockRecovery } from "../domain/lock-recovery.js";
import { randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { withRunningLock } from "./running-lock.js";
import { writeJsonAtomic } from "./atomic-json.js";

export type Execution = { runId: string; version: number };
type State = Execution & {
  completed: boolean;
  deadlineAt?: number;
  lockRecovery?: LockRecovery;
};
async function readResult(output: string): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await readFile(output, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("INVALID-RESULT");
    return value as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { schemaVersion: 1, runs: [] };
    throw error;
  }
}

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
  return withRunningLock(`${output}.publication`, action, true);
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
  if (state.lockRecovery) {
    const r = state.lockRecovery;
    if (
      !["expired", "not-expired", "unknown"].includes(r.deadlineDecision) ||
      r.reason !== "owner-lock-released" ||
      !Number.isSafeInteger(r.checkedAt) ||
      r.checkedAt < 0 ||
      (r.deadlineAt !== null &&
        (!Number.isSafeInteger(r.deadlineAt) || r.deadlineAt < 0)) ||
      (r.ownerRunId !== null &&
        (typeof r.ownerRunId !== "string" ||
          recoveryRecord({ ...state, runId: r.ownerRunId }, 0).ownerRunId ===
            null))
    )
      throw new Error("INVALID-RECOVERY-STATE");
    state.lockRecovery = {
      ownerRunId: r.ownerRunId,
      deadlineAt: r.deadlineAt,
      checkedAt: r.checkedAt,
      deadlineDecision: r.deadlineDecision,
      reason: r.reason,
    };
  }
  return state;
}

/** Reserve before measurement. Ordering is lock acquisition, never wall time. */
export async function beginExecution(
  output: string,
  // Only a caller holding the full-lifetime running lock may recover an owner.
  recovery?: { timeoutMs: number },
): Promise<Execution> {
  output = await canonical(output);
  return locked(output, async () => {
    const previous = await readState(output);
    const version = (previous?.version ?? 0) + 1;
    if (!Number.isSafeInteger(version))
      throw new Error("EXECUTION-VERSION-LIMIT");
    const now = Date.now();
    const deadlineAt = recovery ? now + recovery.timeoutMs : undefined;
    if (
      recovery &&
      (!Number.isSafeInteger(deadlineAt) || recovery.timeoutMs <= 0)
    )
      throw new Error("INVALID-EXECUTION-DEADLINE");
    let lockRecovery = previous?.lockRecovery;
    if (recovery && previous && !previous.completed) {
      lockRecovery = recoveryRecord(previous, now);
      const result = await readResult(output);
      await writeJsonAtomic(output, {
        ...result,
        lockRecovery,
      });
    }
    const execution = { runId: randomUUID(), version };
    await writeJsonAtomic(`${output}.execution.json`, {
      ...execution,
      completed: false,
      ...(lockRecovery ? { lockRecovery } : {}),
      ...(deadlineAt === undefined ? {} : { deadlineAt }),
    });
    return execution;
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
    const result = {
      ...value,
      ...(current.lockRecovery ? { lockRecovery: current.lockRecovery } : {}),
      execution: { ...execution },
    };
    await writeJsonAtomic(output, result);
    await writeJsonAtomic(`${output}.execution.json`, {
      ...current,
      completed: true,
    });
    return result;
  });
}
