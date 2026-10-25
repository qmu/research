type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchN = (value: unknown): value is Fingerprint => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return true;
};
