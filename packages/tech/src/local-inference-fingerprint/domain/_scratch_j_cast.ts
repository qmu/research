type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchJ = (value: unknown): value is Fingerprint => {
  const candidate = value as Record<string, unknown>;
  return Object.keys(candidate).length === 4;
};
