type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

export const scratchH: Fingerprint = {
  os: "linux",
  arch: "x64",
  totalMemoryMiB: 1,
  engineVersion: "v1",
};
