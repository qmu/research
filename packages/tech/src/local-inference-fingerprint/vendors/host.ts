import { arch, platform, release, totalmem } from "node:os";

export type Fingerprint = {
  os: string;
  arch: string;
  totalMemoryMiB: number;
  engineVersion: string;
};

/**
 * Only facts about the measuring host's OS, CPU architecture, total memory
 * and the JS engine running this harness. No hostname, user, network, path
 * or environment-variable value is read, so the result carries no secret or
 * machine identity.
 */
export function collectFingerprint(): Fingerprint {
  return {
    os: `${platform()} ${release()}`,
    arch: arch(),
    totalMemoryMiB: Math.round(totalmem() / (1024 * 1024)),
    engineVersion: process.version,
  };
}
