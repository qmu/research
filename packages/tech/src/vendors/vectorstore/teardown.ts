/**
 * Teardown visibility for the RAG benchmark's per-run cloud resources. The
 * report states that test resources are deleted after the run, so teardown
 * failures must never be silent: every failed deletion surfaces on stderr so an
 * operator can reclaim the remnant (see `sweepAutoRagOrphans` for AutoRAG).
 * Teardown still never throws — a failed delete must not turn a measured run
 * into an error, and must not mask the error that aborted a trial.
 */
export type TeardownWarn = (message: string) => void;

export const defaultTeardownWarn: TeardownWarn = (message) => {
  process.stderr.write(`${message}\n`);
};

export const warnTeardownFailure =
  (
    backendId: string,
    resource: string,
    warn: TeardownWarn = defaultTeardownWarn,
  ) =>
  (error: unknown): undefined => {
    warn(
      `[rag-benchmark] teardown warning (${backendId}): failed to delete ${resource}: ${String(error)}`,
    );
    return undefined;
  };
