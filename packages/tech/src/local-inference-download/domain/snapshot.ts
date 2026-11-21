/** Identity supplied by the comparison that offered the download, never the file. */
export interface SnapshotIdentity {
  runId: string;
  targetCommit: string;
  runnerVersion: string;
}

const runners = new Set([
  "local-inference/2",
  "local-inference/3",
  "local-inference/4",
]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateDownloadIdentity(value: unknown): SnapshotIdentity {
  if (
    !object(value) ||
    typeof value.runId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.runId) ||
    typeof value.targetCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(value.targetCommit) ||
    typeof value.runnerVersion !== "string" ||
    !runners.has(value.runnerVersion)
  ) {
    throw new Error("INVALID-DOWNLOAD-IDENTITY");
  }
  return {
    runId: value.runId,
    targetCommit: value.targetCommit,
    runnerVersion: value.runnerVersion,
  };
}

/** Return the very text validated here; callers must not reopen the source. */
export function verifiedDownloadSnapshot(
  text: string,
  expected: SnapshotIdentity,
): string {
  const identity = validateDownloadIdentity(expected);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("INVALID-DOWNLOAD-SNAPSHOT");
  }
  if (!object(value) || !Array.isArray(value.runs)) {
    throw new Error("INVALID-DOWNLOAD-SNAPSHOT");
  }
  const actual = validateDownloadIdentity(value.execution);
  if (
    actual.runId !== identity.runId ||
    actual.targetCommit !== identity.targetCommit ||
    actual.runnerVersion !== identity.runnerVersion
  ) {
    throw new Error("DOWNLOAD-IDENTITY-MISMATCH");
  }
  return text;
}
