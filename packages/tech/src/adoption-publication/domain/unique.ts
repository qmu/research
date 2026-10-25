export const DUPLICATE_ADOPTION_ROW = "DUPLICATE-ADOPTION-ROW";
export const INVALID_ADOPTION_IDENTITY = "INVALID-ADOPTION-IDENTITY";

export interface AdoptionIdentity {
  engine: string;
  model: string;
  fixture: string;
  runnerVersion: string;
}

const fields = ["engine", "model", "fixture", "runnerVersion"] as const;

/** Validate the complete publication batch before invoking any output sink.
 * Identity is exact and case-sensitive; whitespace-only/padded IDs are invalid.
 * Run IDs, decisions and measurements deliberately do not distinguish rows.
 */
export function publishUniqueAdoptionRows<T>(
  rows: readonly T[],
  publish: (rows: readonly (T & AdoptionIdentity)[]) => void,
): void {
  if (!Array.isArray(rows)) throw new Error(INVALID_ADOPTION_IDENTITY);
  const seen = new Set<string>();
  let duplicate = false;
  for (const row of rows) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(INVALID_ADOPTION_IDENTITY);
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
      throw new Error(INVALID_ADOPTION_IDENTITY);
    }
    const key = JSON.stringify(parts);
    if (seen.has(key)) duplicate = true;
    seen.add(key);
  }
  if (duplicate) throw new Error(DUPLICATE_ADOPTION_ROW);
  publish(rows as readonly (T & AdoptionIdentity)[]);
}
