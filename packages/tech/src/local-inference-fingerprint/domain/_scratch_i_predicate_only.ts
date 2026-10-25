type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchI = (value: unknown): value is Fingerprint => {
  return typeof value === "object" && value !== null;
};
