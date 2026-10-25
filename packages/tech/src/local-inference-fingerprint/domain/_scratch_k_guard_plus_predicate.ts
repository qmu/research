type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchK = (value: unknown): value is Fingerprint => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  return true;
};
