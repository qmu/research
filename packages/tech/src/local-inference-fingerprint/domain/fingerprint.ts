import type { Fingerprint } from "../vendors/host.js";

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
};

const isFingerprint = (value: unknown): value is Fingerprint => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  const keys = Object.keys(value);
  const candidate = value as Record<string, unknown>;
  return (
    keys.length === 4 &&
    typeof candidate.os === "string" &&
    !!candidate.os &&
    typeof candidate.arch === "string" &&
    !!candidate.arch &&
    typeof candidate.totalMemoryMiB === "number" &&
    Number.isFinite(candidate.totalMemoryMiB) &&
    candidate.totalMemoryMiB > 0 &&
    typeof candidate.engineVersion === "string" &&
    !!candidate.engineVersion
  );
};

/** Attach a host fingerprint to a local-inference schemaVersion 1 result, once. */
export function enrichFingerprint(
  source: string,
  fingerprint: Fingerprint,
): Record<string, unknown> {
  const result = object(JSON.parse(source));
  if (
    result.schemaVersion !== 1 ||
    !Array.isArray(result.runs) ||
    !result.runs.length
  )
    throw new Error("Expected local-inference schemaVersion 1 result");
  if ("fingerprint" in result) throw new Error("Fingerprint already exists");
  if (!isFingerprint(fingerprint)) throw new Error("Invalid fingerprint");
  return { ...result, fingerprint };
}
