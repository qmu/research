export type CompletionNotice = {
  execution: { runId: string; version: number };
  result: Record<string, unknown>;
};

/** Validate the transport envelope, not the worker's measurement schema. */
export function parseCompletionNotice(input: unknown): CompletionNotice {
  if (!input || typeof input !== "object") throw new Error("Invalid notice");
  const notice = input as CompletionNotice;
  if (
    !notice.execution ||
    typeof notice.execution.runId !== "string" ||
    !notice.execution.runId.trim() ||
    !Number.isSafeInteger(notice.execution.version) ||
    notice.execution.version < 1 ||
    !notice.result ||
    typeof notice.result !== "object" ||
    Array.isArray(notice.result) ||
    Object.hasOwn(notice.result, "execution")
  )
    throw new Error("Invalid notice");
  return {
    execution: {
      runId: notice.execution.runId,
      version: notice.execution.version,
    },
    result: notice.result,
  };
}
