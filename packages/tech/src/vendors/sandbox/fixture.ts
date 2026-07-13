import { FIXTURE_COLD_START_BASE_MS } from "../../agent-vm/models";
import type { SandboxProvisioner, SandboxTask } from "./types";

/**
 * Keyless, deterministic sandbox provisioner. It boots nothing — it returns
 * fixed per-provider timings (grounded in the landscape survey) with a
 * reproducible per-repetition jitter, so the fixture path renders a realistic,
 * byte-stable page without spend. Warm reuse is a small fraction of cold start;
 * the fixed task is a constant compute time independent of the platform.
 */

const DEFAULT_BASE_MS = 500;
// Deterministic jitter pattern (percent of base), cycled by repetition index —
// gives a p50/p95 spread without any randomness (byte-stable across runs).
const JITTER_PATTERN = [0, 0.04, -0.03, 0.09, 0.02, -0.01, 0.06, 0.03];
const WARM_REUSE_FRACTION = 0.12;
const FIXED_TASK_MS = 118;

export const createFixtureSandboxProvisioner = (
  providerId: string,
): SandboxProvisioner => {
  const base = FIXTURE_COLD_START_BASE_MS[providerId] ?? DEFAULT_BASE_MS;
  let coldCall = 0;
  return {
    provider: providerId,
    bootCold: async () => {
      const jitter = JITTER_PATTERN[coldCall % JITTER_PATTERN.length] ?? 0;
      coldCall += 1;
      return Math.round(base * (1 + jitter));
    },
    reuseWarm: async () => Math.round(base * WARM_REUSE_FRACTION),
    runTask: async (_task: SandboxTask) => FIXED_TASK_MS,
    teardown: async () => {
      // Nothing is provisioned on the fixture path.
    },
  };
};
