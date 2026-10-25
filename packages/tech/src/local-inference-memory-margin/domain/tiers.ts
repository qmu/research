import rawCatalog from "../tiers.json";
import type { FixedCapacityTier } from "./types";

/** `tiers.json` is the hand-authored, reviewable source of truth (status:
 * "illustrative" — see its `note`); this module only type-checks it on load
 * and never invents a tier the file does not list. */

type RawTier = Readonly<{ label: string; totalMiB: number }>;

type RawCatalog = Readonly<{
  status: string;
  note: string;
  tiers: ReadonlyArray<RawTier>;
}>;

// Routed through `unknown` so this module's runtime validation, not the JSON
// import's structural inference, is what the rest of the code relies on.
const catalog = rawCatalog as unknown as RawCatalog;

function parseTier(tier: RawTier): FixedCapacityTier {
  if (!Number.isFinite(tier.totalMiB) || tier.totalMiB <= 0)
    throw new Error(`tier "${tier.label}": totalMiB must be positive finite`);
  if (tier.label.trim() === "")
    throw new Error("tier label must not be empty");
  return { label: tier.label, totalMiB: tier.totalMiB };
}

function assertAscending(tiers: ReadonlyArray<FixedCapacityTier>): void {
  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const cur = tiers[i];
    if (prev && cur && prev.totalMiB >= cur.totalMiB)
      throw new Error(
        `tiers.json must be strictly ascending by totalMiB: ` +
          `"${prev.label}" is not below "${cur.label}"`,
      );
  }
}

export const fixedCapacityTierCatalogStatus: string = catalog.status;

export const FIXED_CAPACITY_TIERS: ReadonlyArray<FixedCapacityTier> =
  catalog.tiers.map(parseTier);

assertAscending(FIXED_CAPACITY_TIERS);

/**
 * Buckets a raw, OS-reported total memory figure (e.g. `os.totalmem()`,
 * which under-reports a vendor's nameplate capacity by whatever the
 * firmware/OS reserves) onto the nearest fixed capacity tier, so hosts
 * nominally "the same" machine class compare on one shared label instead of
 * each reporting its own slightly-off byte count.
 *
 * Returns `null` — never a guessed tier — when no candidate tier is within
 * `toleranceRatio` of the raw value; a caller should treat that as an
 * honest "this host's capacity does not match any known tier", the same
 * discipline this registry applies to every other missing-data case.
 */
export function nearestFixedCapacityTier(
  rawTotalMiB: number,
  tiers: ReadonlyArray<FixedCapacityTier> = FIXED_CAPACITY_TIERS,
  toleranceRatio = 0.1,
): FixedCapacityTier | null {
  if (!Number.isFinite(rawTotalMiB) || rawTotalMiB <= 0) return null;
  let best: FixedCapacityTier | null = null;
  let bestDiff = Infinity;
  for (const tier of tiers) {
    const diff = Math.abs(tier.totalMiB - rawTotalMiB);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = tier;
    }
  }
  if (!best || bestDiff > best.totalMiB * toleranceRatio) return null;
  return best;
}
