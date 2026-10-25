import {
  remeasurementRequest,
  type RecoverableResult,
  type RemeasurementBinding,
  type RemeasurementRequest,
} from "../../local-inference/domain/remeasurement.js";

export const requestTtlMs = 24 * 60 * 60 * 1000;
export type ManagedRequest = RemeasurementRequest & {
  lifecycle?: {
    generation: number;
    createdAt: number;
    expiresAt: number;
    previousRequestId?: string;
  };
};
export type RecoveryIntent = {
  binding: RemeasurementBinding;
  missing: ReturnType<typeof missingRows>;
} & (
  | { action: "create" }
  | { action: "recreate"; previousRequestId: string; generation: number }
);

export function same(left: unknown, right: unknown): boolean {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
        .join(",")}}`;
    return JSON.stringify(value);
  };
  return stable(left) === stable(right);
}

export function clock(now: number) {
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error("INVALID-RECOVERY-TIME");
  return now;
}

/** Uses the actual runner contract; one request includes all missing TTFT/RSS rows. */
export function missingRows(
  result: RecoverableResult,
  binding: RemeasurementBinding,
) {
  const request = remeasurementRequest(result, binding, "preview");
  return (request?.targets ?? []).flatMap((target) => {
    const row = result.runs.find((row) => row.runId === target.runId);
    if (!row) throw new Error("REMEASUREMENT-BINDING-MISMATCH");
    return target.missingMetrics.map((metric) => {
      const reading = row.metrics[metric] as { value: null; reason?: unknown };
      if (
        !["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"].includes(
          reading.reason as string,
        )
      )
        throw new Error("INVALID-MISSING-REASON");
      return {
        runId: target.runId,
        engine: target.engine,
        metric,
        reason: reading.reason as string,
      };
    });
  });
}

export function inspectAdoptionRequest(
  result: RecoverableResult,
  binding: RemeasurementBinding,
  value: unknown,
  now: number,
) {
  clock(now);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-REMEASUREMENT-REQUEST");
  const request = value as ManagedRequest;
  const expected = remeasurementRequest(result, binding, request.requestId);
  if (!expected || !missingRows(result, binding).length)
    throw new Error("RECOVERY-NOT-MISSING");
  let lifecycle: ManagedRequest["lifecycle"];
  if (Object.hasOwn(request, "lifecycle")) {
    const l = request.lifecycle;
    if (
      !l ||
      !Number.isSafeInteger(l.generation) ||
      l.generation < 1 ||
      (l.generation === 1) !== (l.previousRequestId === undefined) ||
      !Number.isSafeInteger(l.createdAt) ||
      l.createdAt < 0 ||
      !Number.isSafeInteger(l.expiresAt) ||
      l.expiresAt <= l.createdAt ||
      (l.previousRequestId !== undefined &&
        (typeof l.previousRequestId !== "string" ||
          !l.previousRequestId ||
          l.previousRequestId === request.requestId))
    )
      throw new Error("INVALID-REQUEST-LIFECYCLE");
    lifecycle = {
      generation: l.generation,
      createdAt: l.createdAt,
      expiresAt: l.expiresAt,
      ...(l.previousRequestId
        ? { previousRequestId: l.previousRequestId }
        : {}),
    };
  }
  const normalized = { ...expected, ...(lifecycle ? { lifecycle } : {}) };
  if (!same(request, normalized)) throw new Error("RECOVERY-IDENTITY-MISMATCH");
  const reason = !lifecycle
    ? "RECOVERY-EXPIRY-UNKNOWN"
    : now >= lifecycle.expiresAt
      ? "RECOVERY-TTL-EXPIRED"
      : null;
  return {
    request: normalized,
    generation: lifecycle?.generation ?? 1,
    status: reason ? ("expired" as const) : ("active" as const),
    reason,
  };
}

export function createAdoptionIntent(
  result: RecoverableResult,
  binding: RemeasurementBinding,
): RecoveryIntent {
  if (!missingRows(result, binding).length)
    throw new Error("RECOVERY-NOT-MISSING");
  const request = remeasurementRequest(result, binding, "preview");
  if (!request) throw new Error("RECOVERY-NOT-MISSING");
  // Normalized binding comes from the runner's existing validation.
  return {
    action: "create",
    binding: request.binding,
    missing: missingRows(result, binding),
  };
}

export function recreateAdoptionIntent(
  result: RecoverableResult,
  binding: RemeasurementBinding,
  previous: unknown,
  now: number,
): RecoveryIntent {
  const state = inspectAdoptionRequest(result, binding, previous, now);
  if (!state.reason) throw new Error("RECOVERY-NOT-EXPIRED");
  const generation = state.generation + 1;
  if (!Number.isSafeInteger(generation))
    throw new Error("RECOVERY-GENERATION-LIMIT");
  return {
    action: "recreate",
    binding: state.request.binding,
    missing: missingRows(result, binding),
    previousRequestId: state.request.requestId,
    generation,
  };
}
