import { describe, expect, it } from "vitest";
import {
  FIXED_CAPACITY_TIERS,
  fixedCapacityTierCatalogStatus,
  nearestFixedCapacityTier,
} from "./tiers";

describe("FIXED_CAPACITY_TIERS", () => {
  it("loads the illustrative catalog, strictly ascending by totalMiB", () => {
    expect(fixedCapacityTierCatalogStatus).toBe("illustrative");
    expect(FIXED_CAPACITY_TIERS.length).toBeGreaterThan(0);
    for (let i = 1; i < FIXED_CAPACITY_TIERS.length; i++) {
      const prev = FIXED_CAPACITY_TIERS[i - 1];
      const cur = FIXED_CAPACITY_TIERS[i];
      expect(cur?.totalMiB).toBeGreaterThan(prev?.totalMiB ?? 0);
    }
  });

  it("includes the 16 GiB and 64 GiB tiers at their exact MiB value", () => {
    const sixteen = FIXED_CAPACITY_TIERS.find((t) => t.label === "16 GiB");
    const sixtyFour = FIXED_CAPACITY_TIERS.find((t) => t.label === "64 GiB");
    expect(sixteen?.totalMiB).toBe(16384);
    expect(sixtyFour?.totalMiB).toBe(65536);
  });
});

describe("nearestFixedCapacityTier", () => {
  it("buckets an OS-under-reported raw value onto its nearest tier", () => {
    // os.totalmem() commonly reports a little under the nameplate figure.
    const tier = nearestFixedCapacityTier(16100);
    expect(tier?.label).toBe("16 GiB");
  });

  it("matches an exact tier value", () => {
    expect(nearestFixedCapacityTier(65536)?.label).toBe("64 GiB");
  });

  it("returns null, not a guess, when nothing is within tolerance", () => {
    expect(nearestFixedCapacityTier(40000)).toBeNull();
  });

  it("returns null for non-finite or non-positive input", () => {
    expect(nearestFixedCapacityTier(0)).toBeNull();
    expect(nearestFixedCapacityTier(-1)).toBeNull();
    expect(nearestFixedCapacityTier(Number.NaN)).toBeNull();
    expect(nearestFixedCapacityTier(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("respects a caller-supplied tier list and tolerance", () => {
    const custom = [{ label: "40 GiB custom", totalMiB: 40000 }];
    expect(nearestFixedCapacityTier(40000, custom)?.label).toBe(
      "40 GiB custom",
    );
    // Default tolerance (10%) would match 32 GiB at 36000; a tighter
    // tolerance should reject it instead of guessing.
    expect(nearestFixedCapacityTier(36000, undefined, 0.01)).toBeNull();
  });
});
