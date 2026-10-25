const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-INFERENCE-IDENTITY");
  return value as Record<string, unknown>;
};
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Validate the whole saved batch before invoking any comparison renderer. */
export function preflightUniqueInference(saved: readonly unknown[]): void {
  const identities = new Set<string>();
  let duplicate = false;
  for (const input of saved) {
    const artifact = record(input);
    const execution = record(artifact.execution);
    if (
      artifact.schemaVersion !== 1 ||
      !text(execution.runId) ||
      !Number.isSafeInteger(execution.version) ||
      (execution.version as number) < 1 ||
      !Array.isArray(artifact.runs)
    )
      throw new Error("INVALID-INFERENCE-IDENTITY");
    for (const value of artifact.runs) {
      const run = record(value);
      if (!text(run.engine)) throw new Error("INVALID-INFERENCE-IDENTITY");
      // JSON tuples avoid delimiter collisions; metrics/model never disambiguate
      // a repeated engine result from the same execution reservation.
      const key = JSON.stringify([
        execution.runId,
        run.engine,
        execution.version,
      ]);
      if (identities.has(key)) duplicate = true;
      identities.add(key);
    }
  }
  if (duplicate) throw new Error("DUPLICATE-INFERENCE-ROW");
}

export function compareUniqueInference<T>(
  saved: readonly unknown[],
  render: (saved: readonly unknown[]) => T,
): T {
  preflightUniqueInference(saved);
  return render(saved);
}
