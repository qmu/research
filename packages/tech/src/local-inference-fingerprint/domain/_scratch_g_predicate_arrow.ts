type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchG = (value: unknown): value is Fingerprint => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 4) return false;
  return true;
};
