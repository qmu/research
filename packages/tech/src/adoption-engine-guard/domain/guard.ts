export type EngineGuardReason =
  | "INVALID-RUNNER-DEFINITION"
  | "INVALID-ADOPTION-ENGINE"
  | "UNKNOWN-ADOPTION-ENGINE";

export type EngineGuardResult =
  { ok: true } | { ok: false; reason: EngineGuardReason };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

/** Validate the whole artifact against a separately supplied runner definition. */
export function validateAdoptionEngines(
  rows: unknown,
  runner: unknown,
): EngineGuardResult {
  if (
    !record(runner) ||
    !Array.isArray(runner.engines) ||
    !runner.engines.length
  )
    return { ok: false, reason: "INVALID-RUNNER-DEFINITION" };
  const engines = new Set<string>();
  for (const engine of runner.engines) {
    if (!identifier(engine) || engines.has(engine))
      return { ok: false, reason: "INVALID-RUNNER-DEFINITION" };
    engines.add(engine);
  }
  if (!Array.isArray(rows))
    return { ok: false, reason: "INVALID-ADOPTION-ENGINE" };
  // Shape errors take precedence over membership, regardless of row order.
  for (const row of rows) {
    if (!record(row) || !identifier(row.engine))
      return { ok: false, reason: "INVALID-ADOPTION-ENGINE" };
  }
  for (const row of rows) {
    if (!engines.has(row.engine))
      return { ok: false, reason: "UNKNOWN-ADOPTION-ENGINE" };
  }
  return { ok: true };
}

/** No publication side effects until every row passes; sink errors propagate. */
export async function publishKnownEngineRows<T>(
  rows: readonly T[],
  runner: unknown,
  publish: (rows: readonly T[]) => void | Promise<void>,
): Promise<EngineGuardResult> {
  const result = validateAdoptionEngines(rows, runner);
  if (!result.ok) return result;
  await publish(rows);
  return result;
}
