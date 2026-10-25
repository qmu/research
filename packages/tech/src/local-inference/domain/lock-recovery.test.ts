import { expect, it } from "vitest";
import { recoveryRecord } from "./lock-recovery.js";

it("uses exact deadline boundaries and fixed non-secret columns", () => {
  const runId = "00000000-0000-4000-8000-000000000000";
  expect(recoveryRecord({ runId, deadlineAt: 100 }, 100)).toEqual({
    ownerRunId: runId,
    deadlineAt: 100,
    checkedAt: 100,
    deadlineDecision: "expired",
    reason: "owner-lock-released",
  });
  expect(recoveryRecord({ runId, deadlineAt: 101 }, 100).deadlineDecision).toBe(
    "not-expired",
  );
  for (const deadlineAt of [undefined, NaN, Infinity, -1, 1.5]) {
    const record = recoveryRecord(
      { runId: "private endpoint", deadlineAt },
      100,
    );
    expect(record.ownerRunId).toBeNull();
    expect(record.deadlineAt).toBeNull();
    expect(record.deadlineDecision).toBe("unknown");
    expect(JSON.stringify(record)).not.toContain("private endpoint");
  }
});
