import { createHash } from "node:crypto";
import {
  reproductionIdentity,
  type ReproductionConditions,
} from "../../reproduction-run/domain/identity";

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Measurements = { [key: string]: JsonValue };
export type ComparisonManifest = ReturnType<typeof reproductionIdentity> & {
  /** Literal argv, never evaluated by this API. Do not supply credentials. */
  command: string[];
};
export interface ComparisonRecord {
  schemaVersion: 1;
  status: "complete";
  manifest: ComparisonManifest;
  measurements: Measurements;
  checksum: string;
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const jsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return Array.from(value).every(jsonValue);
  return (
    object(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(jsonValue)
  );
};

const checksum = (
  manifest: ComparisonManifest,
  measurements: Measurements,
): string =>
  createHash("sha256")
    .update(JSON.stringify({ manifest, measurements }))
    .digest("hex");

/** Snapshot before any I/O, so caller mutation cannot split manifest and results. */
export const comparisonRecord = (
  conditions: ReproductionConditions,
  command: readonly string[],
  measurements: Measurements,
): ComparisonRecord => {
  const identity = reproductionIdentity(conditions);
  if (
    !Array.isArray(command) ||
    command.length === 0 ||
    Array.from(command).some(
      (arg) => typeof arg !== "string" || arg.includes("\0"),
    ) ||
    command[0].trim() === ""
  ) {
    throw new Error("Invalid comparison command");
  }
  if (
    !object(measurements) ||
    Object.keys(measurements).length === 0 ||
    !jsonValue(measurements)
  ) {
    throw new Error("Invalid comparison measurements");
  }
  const manifest = { ...identity, command: [...command] };
  const snapshot: Measurements = JSON.parse(JSON.stringify(measurements));
  return {
    schemaVersion: 1,
    status: "complete",
    manifest,
    measurements: snapshot,
    checksum: checksum(manifest, snapshot),
  };
};

/** Fail closed on truncated, legacy, incomplete or inconsistent artifacts. */
export const parseComparisonRecord = (
  value: unknown,
): ComparisonRecord | undefined => {
  try {
    if (
      !object(value) ||
      value.schemaVersion !== 1 ||
      value.status !== "complete" ||
      !object(value.manifest)
    )
      return undefined;
    const manifest = value.manifest;
    const expected = comparisonRecord(
      manifest as unknown as ReproductionConditions,
      manifest.command as string[],
      value.measurements as Measurements,
    );
    if (
      manifest.runId !== expected.manifest.runId ||
      value.checksum !== expected.checksum
    )
      return undefined;
    return expected;
  } catch {
    return undefined;
  }
};
