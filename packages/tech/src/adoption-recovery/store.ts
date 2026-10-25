import { randomUUID } from "node:crypto";
import type {
  RecoverableResult,
  RemeasurementBinding,
} from "../local-inference/domain/remeasurement.js";
import { remeasurementRequest } from "../local-inference/domain/remeasurement.js";
import { updateCompletedExecution } from "../local-inference/vendors/versioned-result.js";
import {
  clock,
  createAdoptionIntent,
  inspectAdoptionRequest,
  requestTtlMs,
  same,
  type ManagedRequest,
} from "./domain/intent.js";

/** Same artifact and same execution lock as the actual runner. No independent queue.
 * Expected binding is supplied by a trusted comparison publisher, never the intent.
 */
export async function saveAdoptionRecoveryIntent(
  output: string,
  binding: RemeasurementBinding,
  value: unknown,
  timing: { now?: number; ttlMs?: number } = {},
) {
  binding = structuredClone(binding);
  value = structuredClone(value);
  const now = clock(timing.now ?? Date.now());
  const ttlMs = timing.ttlMs ?? requestTtlMs;
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0)
    throw new Error("INVALID-RECOVERY-TTL");
  const expiresAt = clock(now + ttlMs);
  let saved: ManagedRequest | undefined;
  await updateCompletedExecution(output, binding.execution, (valueInStore) => {
    const result = valueInStore as RecoverableResult;
    const intent = value as Record<string, unknown> | null;
    if (!intent || typeof intent !== "object" || Array.isArray(intent))
      throw new Error("INVALID-RECOVERY-INTENT");
    const base = createAdoptionIntent(result, binding);
    const existing = result.remeasurementRequest;
    if (existing === null) throw new Error("INVALID-REMEASUREMENT-REQUEST");
    const state = existing
      ? inspectAdoptionRequest(result, binding, existing, now)
      : undefined;
    let generation = 1;
    let previousRequestId: string | undefined;
    if (intent.action === "create") {
      if (!same(intent, base)) throw new Error("RECOVERY-IDENTITY-MISMATCH");
      if (state) {
        if (state.reason) throw new Error(state.reason);
        saved = state.request;
        return result;
      }
    } else if (intent.action === "recreate") {
      if (!state) throw new Error("RECOVERY-REQUEST-NOT-FOUND");
      const candidate = {
        action: "recreate",
        binding: base.binding,
        missing: base.missing,
        previousRequestId: intent.previousRequestId,
        generation: intent.generation,
      };
      if (
        !same(intent, candidate) ||
        typeof intent.previousRequestId !== "string" ||
        !Number.isSafeInteger(intent.generation)
      )
        throw new Error("INVALID-RECOVERY-INTENT");
      // Exact retries return the already-published successor, never extend TTL.
      const l = state.request.lifecycle;
      if (
        l?.previousRequestId === intent.previousRequestId &&
        l.generation === intent.generation
      ) {
        if (state.reason) throw new Error(state.reason);
        saved = state.request;
        return result;
      }
      if (
        state.request.requestId !== intent.previousRequestId ||
        intent.generation !== state.generation + 1
      )
        throw new Error("RECOVERY-REQUEST-STALE");
      if (!state.reason) throw new Error("RECOVERY-NOT-EXPIRED");
      generation = intent.generation as number;
      previousRequestId = state.request.requestId;
      if (!Number.isSafeInteger(generation))
        throw new Error("RECOVERY-GENERATION-LIMIT");
    } else throw new Error("INVALID-RECOVERY-INTENT");
    const request = remeasurementRequest(result, binding, randomUUID());
    if (!request) throw new Error("RECOVERY-NOT-MISSING");
    saved = {
      ...request,
      lifecycle: {
        generation,
        createdAt: now,
        expiresAt,
        ...(previousRequestId ? { previousRequestId } : {}),
      },
    };
    return { ...result, remeasurementRequest: saved };
  });
  if (!saved) throw new Error("RECOVERY-REQUEST-NOT-FOUND");
  return saved;
}
