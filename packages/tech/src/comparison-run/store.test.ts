import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reproductionIdentity } from "../reproduction-run/domain/identity";
import { main } from "../entrypoints/save-comparison-run";
import { comparisonRecord, parseComparisonRecord } from "./domain/record";
import { loadAdoptionRuns, saveComparisonRun } from "./store";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open), rename: vi.fn(actual.rename) };
});

const conditions = {
  engine: "ollama",
  model: "model@v1",
  fixture: "fixture@v1",
  runnerVersion: "1.0.0",
  targetCommit: "0123456789abcdef0123456789abcdef01234567",
};
const command = ["node", "runner.js", "--fixture", "fixture@v1"];
const measurements = {
  tokensPerSecond: 23,
  quality: { passed: true },
  peakRssBytes: 1024,
  ttftMs: null,
};
let directory: string;
beforeEach(async () => {
  vi.resetAllMocks();
  directory = await mkdtemp(join(tmpdir(), "comparison-run-"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

it("persists all six manifest fields and results together, reusing the existing ID", async () => {
  const path = await saveComparisonRun(
    directory,
    conditions,
    command,
    measurements,
  );
  expect(JSON.parse(await readFile(path, "utf8"))).toEqual(
    comparisonRecord(conditions, command, measurements),
  );
  const runs = await loadAdoptionRuns(directory);
  expect(runs).toHaveLength(1);
  expect(runs[0].manifest).toEqual({
    ...reproductionIdentity(conditions),
    command,
  });
  expect(runs[0].measurements).toEqual(measurements);
});

it("keeps the existing identity hash and canonicalizes SHA case and property order", () => {
  expect(reproductionIdentity(conditions).runId).toBe(
    "repro-v1-eecf45cecc491bd92de63b08182047e14ee586942abe3526e251680284eff360",
  );
  expect(
    reproductionIdentity({
      targetCommit: conditions.targetCommit.toUpperCase(),
      runnerVersion: conditions.runnerVersion,
      fixture: conditions.fixture,
      model: conditions.model,
      engine: conditions.engine,
    }),
  ).toEqual(reproductionIdentity(conditions));
});

it.each([
  "engine",
  "model",
  "fixture",
  "runnerVersion",
  "targetCommit",
] as const)("changing %s changes the existing reproduction ID", (key) => {
  const changed = {
    ...conditions,
    [key]: key === "targetCommit" ? "0".repeat(40) : "different",
  };
  expect(reproductionIdentity(changed).runId).not.toBe(
    reproductionIdentity(conditions).runId,
  );
});

it("snapshots caller-owned data before awaiting I/O", async () => {
  const mutable = { speed: 1 };
  const argv = [...command];
  const saving = saveComparisonRun(directory, conditions, argv, mutable);
  mutable.speed = 9;
  argv[0] = "changed";
  await saving;
  const [saved] = await loadAdoptionRuns(directory);
  expect(saved.measurements).toEqual({ speed: 1 });
  expect(saved.manifest.command).toEqual(command);
});

it("publishes only after file fsync and close, then syncs the directory", async () => {
  const events: string[] = [];
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(fs.open).mockImplementation(async (path, flags, mode) => {
    const handle = await actual.open(path, flags, mode);
    const kind = flags === "wx" ? "file" : "directory";
    const sync = handle.sync.bind(handle);
    const close = handle.close.bind(handle);
    vi.spyOn(handle, "sync").mockImplementation(async () => {
      await sync();
      events.push(`${kind}-sync`);
    });
    vi.spyOn(handle, "close").mockImplementation(async () => {
      await close();
      events.push(`${kind}-close`);
    });
    return handle;
  });
  vi.mocked(fs.rename).mockImplementationOnce(async (from, to) => {
    events.push("rename");
    await actual.rename(from, to);
  });
  await saveComparisonRun(directory, conditions, command, measurements);
  expect(events).toEqual([
    "file-sync",
    "file-close",
    "rename",
    "directory-sync",
    "directory-close",
  ]);
});

it("excludes temporary, truncated, incomplete and mismatched files from adoption", async () => {
  const path = await saveComparisonRun(
    directory,
    conditions,
    command,
    measurements,
  );
  const record = JSON.parse(await readFile(path, "utf8"));
  await writeFile(join(directory, ".interrupted.tmp"), JSON.stringify(record));
  await writeFile(join(directory, "manifest.json"), JSON.stringify(record));
  await writeFile(
    join(directory, `repro-v1-${"0".repeat(64)}.json`),
    JSON.stringify(record),
  );
  expect(await loadAdoptionRuns(directory)).toHaveLength(1);
  for (const value of [
    "{",
    JSON.stringify({ ...record, status: "writing" }),
    JSON.stringify({ ...record, measurements: { tokensPerSecond: 999 } }),
    JSON.stringify({
      ...record,
      manifest: { ...record.manifest, engine: "changed" },
    }),
    JSON.stringify({ measurements }),
  ]) {
    await writeFile(path, value);
    expect(await loadAdoptionRuns(directory)).toEqual([]);
  }
});

it("does not expose a staged full record before rename", async () => {
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(fs.rename).mockImplementationOnce(async (from, to) => {
    expect(
      parseComparisonRecord(JSON.parse(await readFile(from, "utf8"))),
    ).toBeDefined();
    expect(await loadAdoptionRuns(directory)).toEqual([]);
    await actual.rename(from, to);
  });
  await saveComparisonRun(directory, conditions, command, measurements);
  expect(await loadAdoptionRuns(directory)).toHaveLength(1);
});

it("preserves the previous completed pair and cleans up if rename fails", async () => {
  await saveComparisonRun(directory, conditions, command, measurements);
  vi.mocked(fs.rename).mockRejectedValueOnce(
    new Error("injected rename failure"),
  );
  await expect(
    saveComparisonRun(directory, conditions, ["other-runner"], { speed: 9 }),
  ).rejects.toThrow("injected");
  expect((await loadAdoptionRuns(directory))[0].measurements).toEqual(
    measurements,
  );
  expect(await readdir(directory)).toHaveLength(1);
});

it.each(["write", "sync"])(
  "rejects a %s failure without publishing",
  async (stage) => {
    const handle = {
      writeFile: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    (stage === "write" ? handle.writeFile : handle.sync).mockRejectedValueOnce(
      new Error("injected I/O failure"),
    );
    vi.mocked(fs.open).mockResolvedValueOnce(
      handle as unknown as fs.FileHandle,
    );
    await expect(
      saveComparisonRun(directory, conditions, command, measurements),
    ).rejects.toThrow("injected");
    expect(handle.close).toHaveBeenCalledOnce();
    expect(await loadAdoptionRuns(directory)).toEqual([]);
    expect(await readdir(directory)).toEqual([]);
  },
);

it("concurrent replacements never mix a command and another measurement", async () => {
  await Promise.all(
    Array.from({ length: 20 }, (_, trial) =>
      saveComparisonRun(directory, conditions, ["runner", String(trial)], {
        trial,
      }),
    ),
  );
  const [saved] = await loadAdoptionRuns(directory);
  expect(saved.manifest.command[1]).toBe(String(saved.measurements.trial));
  expect(await readdir(directory)).toEqual([`${saved.manifest.runId}.json`]);
});

describe("validation before writing", () => {
  it.each([
    { argv: [] },
    { argv: [""] },
    { argv: ["node", "bad\0arg"] },
    { argv: new Array<string>(2) },
  ])("rejects invalid argv %j", async ({ argv }) => {
    await expect(
      saveComparisonRun(directory, conditions, argv, measurements),
    ).rejects.toThrow("command");
    expect(await readdir(directory)).toEqual([]);
  });
  it.each([
    {},
    { speed: NaN },
    { speed: Infinity },
    { speed: undefined },
    { samples: new Array<number>(2) },
  ])("rejects lossy measurements %j", async (value) => {
    await expect(
      saveComparisonRun(directory, conditions, command, value as never),
    ).rejects.toThrow("measurements");
    expect(await readdir(directory)).toEqual([]);
  });
  it("rejects invalid identity and malformed untrusted records", async () => {
    await expect(
      saveComparisonRun(
        directory,
        { ...conditions, targetCommit: "main" },
        command,
        measurements,
      ),
    ).rejects.toThrow("targetCommit");
    for (const value of [
      null,
      [],
      {},
      { schemaVersion: 1, status: "complete", manifest: {} },
    ])
      expect(parseComparisonRecord(value)).toBeUndefined();
    expect(await readdir(directory)).toEqual([]);
  });
  it("propagates directory I/O errors", async () => {
    await expect(
      loadAdoptionRuns(join(directory, "missing")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

it("saves through the CLI without executing the supplied argv", async () => {
  const input = join(directory, "input.json");
  await writeFile(input, JSON.stringify({ conditions, command, measurements }));
  const output = join(directory, "runs");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await main([input, output]);
  expect(await loadAdoptionRuns(output)).toHaveLength(1);
  expect(log).toHaveBeenCalledOnce();
  await expect(main([])).rejects.toThrow("Usage");
});
