const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
};

export function scratchMinimal(source: string) {
  const result = object(JSON.parse(source));
  if (
    result.schemaVersion !== 1 ||
    !Array.isArray(result.runs) ||
    !result.runs.length
  )
    throw new Error("Expected local-inference schemaVersion 1 result");
  if ("fingerprint" in result) throw new Error("Fingerprint already exists");
  return { ...result, fingerprint: "x" };
}
