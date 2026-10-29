export type MissingReason = "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN";
export type Reading =
  | { value: number; unit: string; tierId: string }
  | { value: null; unit: string; tierId: string; reason: MissingReason };
export interface StrataResult {
  schemaVersion: 1;
  engine: "strata";
  model: string;
  fixedTier: { id: string; capacityMiB: number };
  speed: Reading;
  quality: Reading;
  peakMemory: Reading;
  memoryHeadroom: Reading;
  adoption: "adopt" | "reject" | "undetermined";
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function reading(
  value: unknown,
  unit: string,
  tierId: string,
  maximum = Infinity,
): Reading {
  const raw = object(value);
  if (
    raw.unit === unit &&
    raw.tierId === tierId &&
    typeof raw.value === "number" &&
    Number.isFinite(raw.value) &&
    raw.value >= 0 &&
    raw.value <= maximum
  ) {
    return { value: raw.value, unit, tierId };
  }
  const reason =
    raw.value === null &&
    raw.unit === unit &&
    raw.tierId === tierId &&
    ["NO-FIELD", "MEASURE-FAILED", "NOT-RUN"].includes(String(raw.reason))
      ? (raw.reason as MissingReason)
      : value === undefined
        ? "NO-FIELD"
        : "MEASURE-FAILED";
  return { value: null, unit, tierId, reason };
}

/** Normalize a single execution on one declared fixed memory tier. */
export function buildStrataResult(input: unknown): StrataResult {
  const raw = object(input);
  const tier = object(raw.fixedTier);
  if (raw.engine !== undefined && raw.engine !== "strata") {
    throw new Error("Expected a Strata execution");
  }
  if (
    typeof raw.model !== "string" ||
    !raw.model.trim() ||
    typeof tier.id !== "string" ||
    !tier.id.trim() ||
    typeof tier.capacityMiB !== "number" ||
    !Number.isFinite(tier.capacityMiB) ||
    tier.capacityMiB <= 0
  ) {
    throw new Error(
      "A model and explicit positive fixed memory tier are required",
    );
  }
  const speed = reading(raw.speed, "tokens/s", tier.id);
  const quality = reading(raw.quality, "fraction", tier.id, 1);
  const peakMemory = reading(raw.peakMemory, "MiB", tier.id);
  const memoryHeadroom: Reading =
    peakMemory.value === null
      ? { ...peakMemory }
      : {
          value: tier.capacityMiB - peakMemory.value,
          unit: "MiB",
          tierId: tier.id,
        };
  const complete =
    speed.value !== null &&
    quality.value !== null &&
    memoryHeadroom.value !== null;
  const adoption = !complete
    ? "undetermined"
    : raw.adoption === "reject"
      ? "reject"
      : memoryHeadroom.value !== null && memoryHeadroom.value < 0
        ? "reject"
        : raw.adoption === "adopt"
          ? "adopt"
          : "undetermined";
  return {
    schemaVersion: 1,
    engine: "strata",
    model: raw.model,
    fixedTier: { id: tier.id, capacityMiB: tier.capacityMiB },
    speed,
    quality,
    peakMemory,
    memoryHeadroom,
    adoption,
  };
}
