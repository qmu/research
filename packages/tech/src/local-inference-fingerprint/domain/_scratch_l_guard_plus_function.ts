type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export function scratchL(value: unknown): value is Fingerprint {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  return true;
}
