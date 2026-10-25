import { describe, expect, it } from "vitest";
import {
  parseProcessSnapshot,
  createProcessTreeSampler,
  type ProcessRow,
} from "./peak-rss.js";

const started = "Sun Oct 25 12:00:00 2026";
const row = (
  pid: number,
  ppid: number,
  pgid: number,
  rssKiB: number,
): ProcessRow => ({ pid, ppid, pgid, rssKiB, state: "S", started });

describe("process table parsing", () => {
  it("parses headerless Darwin/Linux ps RSS in KiB without command text", () => {
    expect(parseProcessSnapshot(`  40 1 40 1536 Ss ${started}\n`)).toEqual([
      { ...row(40, 1, 40, 1536), state: "Ss" },
    ]);
    expect(parseProcessSnapshot("\n")).toEqual([]);
  });
  it.each([
    `40 1 40 -1 S ${started}`,
    `40 1 40 1.5 S ${started}`,
    `40 1 40 NaN S ${started}`,
    `40 1 40 9007199254740992 S ${started}`,
    `0 1 40 1 S ${started}`,
    `40 1 40 1 S ${started}\n40 1 40 2 S ${started}`,
    `40 1 40 1 S ${started}\nunrelated malformed row`,
  ])("rejects an invalid or ambiguous snapshot: %s", (text) => {
    expect(parseProcessSnapshot(text)).toBeNull();
  });
});

describe("simultaneous process-tree RSS", () => {
  it("sums root, children, and grandchildren once, excluding unrelated processes", () => {
    const tree = createProcessTreeSampler(40);
    expect(
      tree
        .sample([
          row(42, 41, 90, 3072), // Grandchild changed process group; appears first.
          row(41, 40, 40, 2048),
          row(40, 1, 40, 1024),
          row(90, 1, 90, 999999),
        ])
        .members.map((member) => member.pid),
    ).toEqual([42, 41, 40]);
    expect(tree.reading()).toEqual({ value: 6, unit: "MiB" });
  });
  it("maximizes simultaneous sums, never the sum of individual peaks", () => {
    const tree = createProcessTreeSampler(40);
    tree.sample([row(40, 1, 40, 1024), row(41, 40, 40, 8192)]);
    tree.sample([row(40, 1, 40, 8192), row(41, 40, 40, 1024)]);
    expect(tree.reading()).toEqual({ value: 9, unit: "MiB" });
    expect(tree.sampleCount).toBe(2);
  });
  it("retains group members and observed escaped descendants after root exit/reparenting", () => {
    const tree = createProcessTreeSampler(40);
    tree.sample([row(40, 1, 40, 1024), row(41, 40, 41, 2048)]);
    tree.sample([row(41, 1, 41, 4096), row(42, 1, 40, 8192)]);
    expect(tree.reading()).toEqual({ value: 12, unit: "MiB" });
  });
  it("drops disappeared identities and excludes PID reuse, zombies, and unobserved escapes", () => {
    const tree = createProcessTreeSampler(40);
    tree.sample([row(40, 1, 40, 1024), row(41, 40, 41, 2048)]);
    const snapshot = [
      { ...row(40, 1, 40, 10000), state: "Z" },
      { ...row(41, 1, 41, 10000), started: "Sun Oct 25 12:00:01 2026" },
      row(42, 1, 42, 10000),
    ];
    expect(tree.sample(snapshot).members).toEqual([]);
    expect(tree.sample([row(41, 1, 41, 10000)]).members).toEqual([]);
    expect(tree.reading()).toEqual({ value: 3, unit: "MiB" });
  });
  it("does not invent a reading when the execution finishes between samples", () => {
    const tree = createProcessTreeSampler(40);
    tree.sample([row(90, 1, 90, 999999)]);
    expect(tree.reading()).toEqual({
      value: null,
      unit: "MiB",
      reason: "NO-FIELD",
    });
  });
  it("rejects an aggregate beyond safe integer precision", () => {
    const tree = createProcessTreeSampler(40);
    expect(
      tree.sample([row(40, 1, 40, Number.MAX_SAFE_INTEGER), row(41, 40, 40, 1)])
        .valid,
    ).toBe(false);
  });
});
