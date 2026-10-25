export function scratchF(candidate: Record<string, unknown>): boolean {
  if (
    typeof candidate.totalMemoryMiB !== "number" ||
    !Number.isFinite(candidate.totalMemoryMiB) ||
    candidate.totalMemoryMiB <= 0
  )
    return false;
  return true;
}
