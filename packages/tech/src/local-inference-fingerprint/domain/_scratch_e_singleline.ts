export function scratchE(candidate: Record<string, unknown>): boolean {
  if (Object.keys(candidate).length !== 4) return false;
  if (typeof candidate.os !== "string" || !candidate.os) return false;
  if (typeof candidate.arch !== "string" || !candidate.arch) return false;
  if (typeof candidate.engineVersion !== "string" || !candidate.engineVersion)
    return false;
  return true;
}
