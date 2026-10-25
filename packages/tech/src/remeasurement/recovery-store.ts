import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { remeasurementRequest } from "./domain/request.js";

// Matches the failure vocabulary of the snapshot recovery producer (#248).
export const snapshotFailureReasons = [
  "SNAPSHOT-READ-FAILED",
  "SNAPSHOT-JSON-INVALID",
  "SNAPSHOT-IDENTITY-MISMATCH",
] as const;

function recoveryRequest(input: unknown) {
  const request = remeasurementRequest(input);
  const reason = (input as Record<string, unknown>).reason;
  if (
    !request.source ||
    !snapshotFailureReasons.some((code) => code === reason)
  )
    throw new Error("INVALID-RECOVERY-REQUEST");
  return {
    ...request,
    reason: reason as (typeof snapshotFailureReasons)[number],
    requiresNewExecutionId: true as const,
    requiresNewArtifact: true as const,
  };
}

function hasCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

export const defaultRecoveryTtlMs = 24 * 60 * 60 * 1000;
export const recoveryExpiryReasons = [
  "RECOVERY-TTL-EXPIRED",
  "RECOVERY-EXPIRY-UNKNOWN",
] as const;

export interface RecoveryTiming {
  /** Unix milliseconds; injectable for deterministic callers/tests. */
  now?: number;
  ttlMs?: number;
}

type Request = ReturnType<typeof recoveryRequest>;
type StoredRequest = Request & {
  createdAt?: number;
  expiresAt?: number;
  recreatedFrom?: string;
};

function clock(now: unknown) {
  if (typeof now !== "number" || !Number.isSafeInteger(now) || now < 0)
    throw new Error("INVALID-RECOVERY-TIME");
  return now;
}

function timed(request: Request, timing: RecoveryTiming) {
  const createdAt = clock(timing.now ?? Date.now());
  const ttlMs = timing.ttlMs ?? defaultRecoveryTtlMs;
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0)
    throw new Error("INVALID-RECOVERY-TTL");
  const expiresAt = clock(createdAt + ttlMs);
  return { ...request, createdAt, expiresAt };
}

function scopeOf(request: Request) {
  return remeasurementRequest({ ...request, executionVersion: 1 })
    .idempotencyKey;
}

function location(directory: string, request: Request) {
  return join(directory, `recovery-${scopeOf(request)}.json`);
}

async function readCurrent(destination: string, scope: string) {
  let bytes: string;
  try {
    bytes = await readFile(destination, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
  try {
    const data = JSON.parse(bytes) as Record<string, unknown>;
    const request: StoredRequest = recoveryRequest(data);
    if (Object.hasOwn(data, "createdAt") || Object.hasOwn(data, "expiresAt")) {
      request.createdAt = clock(data.createdAt);
      request.expiresAt = clock(data.expiresAt);
      if (request.expiresAt <= request.createdAt) throw new Error("invalid");
    }
    if (Object.hasOwn(data, "recreatedFrom")) {
      if (
        request.createdAt === undefined ||
        typeof data.recreatedFrom !== "string" ||
        !/^remeasurement-v1-[a-f0-9]{64}$/.test(data.recreatedFrom)
      )
        throw new Error("invalid");
      request.recreatedFrom = data.recreatedFrom;
    }
    if (JSON.stringify(request) + "\n" !== bytes || scopeOf(request) !== scope)
      throw new Error("invalid");
    return request;
  } catch {
    throw new Error("RECOVERY-STORE-CORRUPT");
  }
}

function sameRequest(left: Request, right: Request) {
  return (
    JSON.stringify(recoveryRequest(left)) ===
    JSON.stringify(recoveryRequest(right))
  );
}

function expiryReason(request: StoredRequest, now: number) {
  if (request.expiresAt === undefined) return recoveryExpiryReasons[1];
  return now >= request.expiresAt ? recoveryExpiryReasons[0] : null;
}

function assertExpected(current: Request, expected: Request) {
  if (current.executionVersion !== expected.executionVersion)
    throw new Error("RECOVERY-STORE-STALE");
  if (!sameRequest(current, expected))
    throw new Error("RECOVERY-IDENTITY-MISMATCH");
}

/** Inspect with a trusted, pinned identity, never identity recovered from a failed artifact.
 * Legacy records have no provable deadline and are treated as expired.
 */
export async function inspectSnapshotRecoveryRequest(
  directory: string,
  expectedInput: unknown,
  now = Date.now(),
) {
  const expected = recoveryRequest(expectedInput);
  clock(now);
  const current = await readCurrent(
    location(directory, expected),
    scopeOf(expected),
  );
  if (!current) throw new Error("RECOVERY-STORE-NOT-FOUND");
  assertExpected(current, expected);
  const reason = expiryReason(current, now);
  return {
    request: current,
    status: reason ? ("expired" as const) : ("active" as const),
    reason,
    // Only normalized public fields are returned. Re-creation rechecks under lock.
    recreation:
      reason && current.executionVersion < Number.MAX_SAFE_INTEGER
        ? {
            expected: recoveryRequest(current),
            minimumExecutionVersion: current.executionVersion + 1,
          }
        : null,
  };
}

/** All mutations share the original per-scope, cross-process lock and atomic rename. */
async function mutate(
  directory: string,
  request: Request,
  update: (current: StoredRequest | undefined) => {
    changed: boolean;
    request: StoredRequest;
  },
) {
  await mkdir(directory, { recursive: true });
  const destination = location(directory, request);
  const lock = `${destination}.lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if (hasCode(error, "EEXIST")) throw new Error("RECOVERY-STORE-BUSY");
    throw error;
  }
  const temporary = join(lock, `pending-${randomUUID()}`);
  try {
    const result = update(await readCurrent(destination, scopeOf(request)));
    if (!result.changed) return result;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(result.request) + "\n", "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, destination);
    const dir = await open(directory, "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
    return result;
  } finally {
    try {
      await unlink(temporary);
    } catch (error) {
      if (!hasCode(error, "ENOENT")) throw error;
    } finally {
      await rmdir(lock);
    }
  }
}

/** Existing higher-generation save semantics remain available for new failed snapshots.
 * Exact retries return persisted timestamps, even after expiration; they never renew TTL.
 */
export async function saveSnapshotRecoveryRequest(
  directory: string,
  input: unknown,
  timing: RecoveryTiming = {},
) {
  const request = recoveryRequest(input);
  const candidate = timed(request, timing);
  return mutate(directory, request, (current) => {
    if (current) {
      if (request.executionVersion < current.executionVersion)
        throw new Error("RECOVERY-STORE-STALE");
      if (request.executionVersion === current.executionVersion) {
        if (!sameRequest(request, current))
          throw new Error("RECOVERY-STORE-CONFLICT");
        return { changed: false, request: current };
      }
    }
    return { changed: true, request: candidate };
  });
}

/** Recreate an expired generation while preserving its source, fixtures and failure reason.
 * Repeating the same predecessor/next-version pair is idempotent; older pairs fail stale.
 */
export async function recreateSnapshotRecoveryRequest(
  directory: string,
  expectedInput: unknown,
  executionVersion: number,
  timing: RecoveryTiming = {},
) {
  const expected = recoveryRequest(expectedInput);
  const request = recoveryRequest({ ...expected, executionVersion });
  if (executionVersion <= expected.executionVersion)
    throw new Error("RECOVERY-STORE-STALE");
  const candidate = {
    ...timed(request, timing),
    recreatedFrom: expected.idempotencyKey,
  };
  return mutate(directory, expected, (current) => {
    if (!current) throw new Error("RECOVERY-STORE-NOT-FOUND");
    if (
      current.executionVersion === executionVersion &&
      current.recreatedFrom === expected.idempotencyKey &&
      sameRequest(current, request)
    )
      return { changed: false, request: current };
    assertExpected(current, expected);
    if (!expiryReason(current, candidate.createdAt))
      throw new Error("RECOVERY-NOT-EXPIRED");
    return { changed: true, request: candidate };
  });
}
