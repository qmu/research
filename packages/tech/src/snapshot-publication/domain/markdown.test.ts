import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  renderVerifiedSnapshotResults,
  type VerifiedSnapshotResult,
} from "./markdown.js";

const valid: VerifiedSnapshotResult = {
  verification: "verified",
  runId: "demo-adopt",
  commit: "a".repeat(40),
  runnerVersion: "1.0.0",
  decision: "adopt",
  // Deliberately reversed insertion order.
  reasons: {
    environment: "pass",
    memory: "pass",
    quality: "pass",
    speed: "pass",
  },
};

describe("verified snapshot publication", () => {
  it("publishes adopted and rejected runs with reasons in fixed axis order", () => {
    const markdown = renderVerifiedSnapshotResults([
      valid,
      {
        ...valid,
        runId: "demo-reject",
        decision: "reject",
        reasons: {
          environment: "unsupported",
          memory: "missing",
          quality: "fail",
          speed: "pass",
        },
      },
    ]);
    expect(markdown).toContain("### Run demo-adopt: Adopt");
    expect(markdown).toContain("### Run demo-reject: Reject");
    expect(markdown).toContain(
      [
        "| Speed | Meets policy |",
        "| Quality | Does not meet policy |",
        "| Memory | Evidence missing |",
        "| Environment | Measurement unsupported |",
      ].join("\n"),
    );
    const page = readFileSync(
      new URL("../../../../../docs/snapshot-publication.md", import.meta.url),
      "utf8",
    );
    expect(page).toContain(markdown);
  });

  it.each([
    { verification: "unverified" },
    { commit: "" },
    { runnerVersion: 123 },
    { runId: null },
    { runnerVersion: "" },
    { runId: "unsafe|<script>" },
    { reasons: { speed: "pass" } },
    { reasons: { ...valid.reasons, quality: "secret text" } },
    { reasons: { ...valid.reasons, memory: "toString" } },
    { decision: "reject" },
    { reasons: { ...valid.reasons, environment: "fail" } },
  ])("refuses incomplete, unsafe or contradictory output: %j", (patch) => {
    expect(() =>
      renderVerifiedSnapshotResults([
        { ...valid, ...patch } as VerifiedSnapshotResult,
      ]),
    ).toThrow();
  });

  it("refuses empty and duplicate runs", () => {
    expect(() => renderVerifiedSnapshotResults([])).toThrow();
    expect(() => renderVerifiedSnapshotResults([valid, valid])).toThrow();
  });

  it("CLI emits the table, and emits no partial output or raw error on invalid input", () => {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-publication-"));
    const path = join(dir, "results.json");
    const args = [
      "--import",
      "tsx/esm",
      "src/entrypoints/render-snapshot-publication.ts",
      path,
    ];
    try {
      writeFileSync(path, JSON.stringify([valid]));
      expect(execFileSync(process.execPath, args, { encoding: "utf8" })).toBe(
        renderVerifiedSnapshotResults([valid]),
      );
      writeFileSync(
        path,
        JSON.stringify([valid, { ...valid, runId: "SECRET|unsafe" }]),
      );
      const failed = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(failed.status).toBe(1);
      expect(failed.stdout).toBe("");
      expect(failed.stderr).not.toContain("SECRET");
      writeFileSync(path, "SECRET malformed JSON");
      const malformed = spawnSync(process.execPath, args, { encoding: "utf8" });
      expect(malformed.status).toBe(1);
      expect(malformed.stdout).toBe("");
      expect(malformed.stderr).not.toContain("SECRET");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
