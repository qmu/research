import { hostname } from "node:os";
import { expect, it } from "vitest";
import { enrichFingerprint } from "./fingerprint.js";
import { collectFingerprint } from "../vendors/host.js";

const source = JSON.stringify({
  schemaVersion: 1,
  inputSha256: "a".repeat(64),
  runs: [
    { engine: "mlx", model: "synthetic", status: "measured", metrics: {} },
  ],
});

const validFingerprint = {
  os: "linux 6.1.0",
  arch: "x64",
  totalMemoryMiB: 16384,
  engineVersion: "v22.10.0",
};

it("attaches the fingerprint while preserving the original fields", () => {
  const result = enrichFingerprint(source, validFingerprint);
  expect(result.fingerprint).toEqual(validFingerprint);
  expect(result.schemaVersion).toBe(1);
  expect(result.runs).toEqual(JSON.parse(source).runs);
});

it("rejects a result that is not schemaVersion 1", () => {
  const other = JSON.stringify({
    ...JSON.parse(source),
    schemaVersion: 2,
  });
  expect(() => enrichFingerprint(other, validFingerprint)).toThrow();
});

it("rejects a result with an empty runs array", () => {
  const empty = JSON.stringify({ ...JSON.parse(source), runs: [] });
  expect(() => enrichFingerprint(empty, validFingerprint)).toThrow();
});

it("refuses to overwrite an existing fingerprint", () => {
  const already = JSON.stringify({
    ...JSON.parse(source),
    fingerprint: validFingerprint,
  });
  expect(() => enrichFingerprint(already, validFingerprint)).toThrow();
});

it.each([
  { ...validFingerprint, os: "" },
  { ...validFingerprint, arch: 1 },
  { ...validFingerprint, totalMemoryMiB: 0 },
  { ...validFingerprint, totalMemoryMiB: Number.NaN },
  { ...validFingerprint, engineVersion: "" },
  { ...validFingerprint, extra: "unexpected" },
])("rejects an invalid fingerprint shape %#", (invalid) => {
  expect(() =>
    enrichFingerprint(source, invalid as never),
  ).toThrow();
});

it("collects a fingerprint carrying no host, user or network identity", () => {
  const fingerprint = collectFingerprint();
  expect(Object.keys(fingerprint).sort()).toEqual([
    "arch",
    "engineVersion",
    "os",
    "totalMemoryMiB",
  ]);
  const serialized = JSON.stringify(fingerprint);
  expect(serialized).not.toContain(process.cwd());
  expect(serialized).not.toContain(hostname());
  expect(typeof fingerprint.os).toBe("string");
  expect(typeof fingerprint.arch).toBe("string");
  expect(fingerprint.totalMemoryMiB).toBeGreaterThan(0);
  expect(fingerprint.engineVersion).toBe(process.version);
});
