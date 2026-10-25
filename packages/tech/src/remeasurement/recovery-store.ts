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

/** Latest recovery per commit/runner/fixture set, serialized across processes.
 * A busy or abandoned lock fails closed; callers retry without stealing locks.
 */
export async function saveSnapshotRecoveryRequest(
  directory: string,
  input: unknown,
) {
  const request = recoveryRequest(input);
  // Deliberately exclude executionVersion and source from the destination:
  // older generations and competing failed runs must meet the same boundary.
  const scope = remeasurementRequest({
    ...request,
    executionVersion: 1,
  }).idempotencyKey;
  const bytes = JSON.stringify(request) + "\n";
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `recovery-${scope}.json`);
  const lock = `${destination}.lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if (hasCode(error, "EEXIST")) throw new Error("RECOVERY-STORE-BUSY");
    throw error;
  }
  const temporary = join(lock, `pending-${randomUUID()}`);
  try {
    let previous: string | undefined;
    try {
      previous = await readFile(destination, "utf8");
    } catch (error) {
      if (!hasCode(error, "ENOENT")) throw error;
    }
    if (previous !== undefined) {
      let current: ReturnType<typeof recoveryRequest>;
      try {
        current = recoveryRequest(JSON.parse(previous));
        if (
          JSON.stringify(current) + "\n" !== previous ||
          remeasurementRequest({ ...current, executionVersion: 1 })
            .idempotencyKey !== scope
        )
          throw new Error("invalid");
      } catch {
        throw new Error("RECOVERY-STORE-CORRUPT");
      }
      if (request.executionVersion < current.executionVersion)
        throw new Error("RECOVERY-STORE-STALE");
      if (request.executionVersion === current.executionVersion) {
        if (bytes !== previous) throw new Error("RECOVERY-STORE-CONFLICT");
        return { changed: false, request };
      }
    }
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(bytes, "utf8");
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
    return { changed: true, request };
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
