import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeJsonAtomic } from "./atomic-json.js";

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof fs>()),
  open: vi.fn((...args: Parameters<typeof fs.open>) => actual.open(...args)),
  rename: vi.fn((...args: Parameters<typeof fs.rename>) =>
    actual.rename(...args),
  ),
}));
const actual = await vi.importActual<typeof fs>("node:fs/promises");
const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.mocked(fs.open)
    .mockReset()
    .mockImplementation((...args) => actual.open(...args));
  vi.mocked(fs.rename)
    .mockReset()
    .mockImplementation((...args) => actual.rename(...args));
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => actual.rm(dir, { recursive: true, force: true })),
  );
});
async function setup() {
  const dir = await fs.mkdtemp(join(tmpdir(), "atomic-json-"));
  directories.push(dir);
  const output = join(dir, "result.json");
  await fs.writeFile(output, '{"previous":true}\n');
  return { dir, output };
}

describe("atomic common JSON publication", () => {
  it.each([
    undefined,
    () => undefined,
    Symbol("result"),
    { toJSON: () => undefined },
  ])(
    "rejects non-JSON values before opening a temporary file (%s)",
    async (value) => {
      const { dir, output } = await setup();
      await expect(writeJsonAtomic(output, value)).rejects.toThrow(
        "Result must be JSON serializable",
      );
      expect(fs.open).not.toHaveBeenCalled();
      expect(fs.rename).not.toHaveBeenCalled();
      expect(await fs.readFile(output, "utf8")).toBe('{"previous":true}\n');
      expect(await fs.readdir(dir)).toEqual(["result.json"]);
    },
  );
  it("keeps the previous JSON visible until the closed, synced file is renamed", async () => {
    const { dir, output } = await setup();
    const value = { next: true, execution: { runId: "test-run", version: 2 } };
    const events: string[] = [];
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      const file = await actual.open(...args);
      const sync = file.sync.bind(file);
      const close = file.close.bind(file);
      vi.spyOn(file, "sync").mockImplementation(async () => {
        await sync();
        events.push("sync");
      });
      vi.spyOn(file, "close").mockImplementation(async () => {
        await close();
        events.push("close");
      });
      return file;
    });
    vi.mocked(fs.rename).mockImplementationOnce(async (source, target) => {
      expect(events).toEqual(["sync", "close"]);
      expect(await fs.readFile(output, "utf8")).toBe('{"previous":true}\n');
      expect(JSON.parse(await fs.readFile(source, "utf8"))).toEqual(value);
      await actual.rename(source, target);
    });
    await writeJsonAtomic(output, value);
    expect(await fs.readFile(output, "utf8")).toBe(
      JSON.stringify(value, null, 2) + "\n",
    );
    expect(await fs.readdir(dir)).toEqual(["result.json"]);
  });

  for (const stage of [
    "open",
    "writeFile",
    "sync",
    "close",
    "rename",
  ] as const) {
    it(`preserves the existing bytes and cleans temporary files after ${stage} failure`, async () => {
      const { dir, output } = await setup();
      const failure = new Error(`injected ${stage} failure`);
      if (stage === "rename")
        vi.mocked(fs.rename).mockRejectedValueOnce(failure);
      else if (stage === "open")
        vi.mocked(fs.open).mockRejectedValueOnce(failure);
      else
        vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
          const file = await actual.open(...args);
          if (stage === "close") {
            const close = file.close.bind(file);
            vi.spyOn(file, "close").mockImplementationOnce(async () => {
              await close();
              throw failure;
            });
          } else if (stage === "writeFile") {
            vi.spyOn(file, "writeFile").mockImplementationOnce(async () => {
              await file.write("{partial");
              throw failure;
            });
          } else vi.spyOn(file, stage).mockRejectedValueOnce(failure);
          return file;
        });
      await expect(writeJsonAtomic(output, { next: true })).rejects.toThrow(
        failure,
      );
      expect(await fs.readFile(output, "utf8")).toBe('{"previous":true}\n');
      expect(await fs.readdir(dir)).toEqual(["result.json"]);
    });
  }

  it("creates a new output and rejects serialization failure without touching existing JSON", async () => {
    const { dir, output } = await setup();
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    await expect(writeJsonAtomic(output, cyclic)).rejects.toThrow();
    expect(await fs.readFile(output, "utf8")).toBe('{"previous":true}\n');
    await writeJsonAtomic(join(dir, "new.json"), { created: true });
    expect(
      JSON.parse(await fs.readFile(join(dir, "new.json"), "utf8")),
    ).toEqual({ created: true });
    expect((await fs.readdir(dir)).sort()).toEqual(["new.json", "result.json"]);
  });
});
