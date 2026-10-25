type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

const isFingerprint = (value: unknown): value is Fingerprint => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 4) return false;
  if (typeof candidate.os !== "string" || !candidate.os) return false;
  if (typeof candidate.arch !== "string" || !candidate.arch) return false;
  if (
    typeof candidate.totalMemoryMiB !== "number" ||
    !Number.isFinite(candidate.totalMemoryMiB) ||
    candidate.totalMemoryMiB <= 0
  )
    return false;
  if (typeof candidate.engineVersion !== "string" || !candidate.engineVersion)
    return false;
  return true;
};

export function scratchB(value: unknown) {
  return isFingerprint(value);
}
