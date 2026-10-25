import type { Fingerprint } from "../vendors/host.js";

export function scratchD(value: unknown): value is Fingerprint {
  return typeof value === "object";
}
