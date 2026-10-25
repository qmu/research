export type LockRecovery = {
  ownerRunId: string | null;
  deadlineAt: number | null;
  checkedAt: number;
  deadlineDecision: "expired" | "not-expired" | "unknown";
  reason: "owner-lock-released";
};

// Reconstruct a fixed non-secret record; never spread untrusted metadata.
export function recoveryRecord(
  state: { runId: string; deadlineAt?: number },
  now: number,
): LockRecovery {
  const deadlineAt =
    typeof state.deadlineAt === "number" &&
    Number.isSafeInteger(state.deadlineAt) &&
    state.deadlineAt >= 0
      ? state.deadlineAt
      : null;
  return {
    ownerRunId:
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        state.runId,
      )
        ? state.runId
        : null,
    deadlineAt,
    checkedAt: now,
    deadlineDecision:
      deadlineAt === null
        ? "unknown"
        : now >= deadlineAt
          ? "expired"
          : "not-expired",
    reason: "owner-lock-released",
  };
}
