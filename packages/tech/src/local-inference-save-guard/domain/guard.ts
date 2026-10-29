export const DUPLICATE_SAVE_ROW = "DUPLICATE-SAVE-ROW";
export const INVALID_SAVE_IDENTITY = "INVALID-SAVE-IDENTITY";

export interface SaveIdentity {
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
  targetCommit: string;
}

const fields = [
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const;

/** Validate the entire save batch before invoking any storage sink. Identity is
 * the exact, case-sensitive five-element tuple; whitespace-only/padded
 * identifiers are invalid. Run IDs, decisions and measurements deliberately do
 * not distinguish rows — a save that would only change those under an
 * already-saved five-part identity is rejected rather than silently
 * overwriting or duplicating an existing saved comparison.
 */
export function saveUniqueRunRows<T>(
  rows: readonly T[],
  save: (rows: readonly (T & SaveIdentity)[]) => void,
): void {
  if (!Array.isArray(rows)) throw new Error(INVALID_SAVE_IDENTITY);
  const seen = new Set<string>();
  let duplicate = false;
  for (const row of rows) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(INVALID_SAVE_IDENTITY);
    }
    const identity = row as Record<string, unknown>;
    const parts = fields.map((field) => identity[field]);
    if (
      parts.some(
        (value) =>
          typeof value !== "string" ||
          value.length === 0 ||
          value.trim() !== value,
      )
    ) {
      throw new Error(INVALID_SAVE_IDENTITY);
    }
    const key = JSON.stringify(parts);
    if (seen.has(key)) duplicate = true;
    seen.add(key);
  }
  if (duplicate) throw new Error(DUPLICATE_SAVE_ROW);
  save(rows as readonly (T & SaveIdentity)[]);
}
