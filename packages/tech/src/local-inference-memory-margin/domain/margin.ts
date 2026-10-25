import type { FixedCapacityTier, MemoryMargin, MemoryReading } from "./types";
import { nearestFixedCapacityTier } from "./tiers";

/**
 * `tier.totalMiB - reading.value`. A missing or failed reading propagates
 * its reason code rather than being treated as zero usage (which would
 * read as unlimited headroom) or as full usage (which would read as no
 * headroom) — either fabrication the rest of this registry's convention
 * rules out. `insufficient` (a negative margin) is reported as a number,
 * not silently clamped to zero, so a reader sees by how much the use case
 * overruns the tier, not just that it does.
 */
export function computeMemoryMargin(
  reading: MemoryReading,
  tier: FixedCapacityTier,
): MemoryMargin {
  if (reading.value === null)
    return { status: "undetermined", reason: reading.reason, tier };
  const marginMiB = tier.totalMiB - reading.value;
  return marginMiB >= 0
    ? { status: "ok", marginMiB, tier }
    : { status: "insufficient", marginMiB, tier };
}

/**
 * Buckets `rawTotalMiB` onto a fixed capacity tier first, then computes the
 * margin against it. Returns `undetermined`/`NO-TIER` (never a guessed
 * tier) when `rawTotalMiB` matches no known tier within `toleranceRatio`.
 */
export function computeMemoryMarginFromRawCapacity(
  reading: MemoryReading,
  rawTotalMiB: number,
  tiers?: ReadonlyArray<FixedCapacityTier>,
  toleranceRatio?: number,
): MemoryMargin {
  const tier = nearestFixedCapacityTier(rawTotalMiB, tiers, toleranceRatio);
  if (!tier) return { status: "undetermined", reason: "NO-TIER", tier: null };
  return computeMemoryMargin(reading, tier);
}
