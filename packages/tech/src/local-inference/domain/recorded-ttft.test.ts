import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import measured from "../vendors/fixtures/strata-ttft-warmup.json";
import { withRecordedStrataTtft } from "./recorded-ttft.js";
import { saveRecordedStrataTtft } from "../import.js";

const gap = { value: null, unit: "s", reason: "NO-FIELD" };
const input = {
  schemaVersion: 1,
  inputSha256: "fixture",
  runs: [
    { engine: "ollama", metrics: { ttft: gap } },
    { engine: "strata", model: "fixture", metrics: { ttft: gap, tps: gap } },
  ],
};

describe("recorded Strata TTFT persistence", () => {
  it.each([
    [measured, { value: 2.689731, unit: "s", source: "client" }],
    [{ ...measured, first_answer_offset_s: undefined }, gap],
    [
      { ...measured, first_answer_offset_s: null },
      { ...gap, reason: "MEASURE-FAILED" },
    ],
    [
      { ...measured, first_answer_offset_s: -1 },
      { ...gap, reason: "MEASURE-FAILED" },
    ],
    [
      { ...measured, dispatch_offset_s: 3 },
      { ...gap, reason: "MEASURE-FAILED" },
    ],
  ])(
    "saves normalized metrics without changing other evidence",
    async (record, ttft) => {
      const dir = await mkdtemp(join(tmpdir(), "strata-ttft-"));
      try {
        const source = join(dir, "input.json");
        const captured = join(dir, "record.json");
        const output = join(dir, "output.json");
        const original = JSON.stringify(input);
        await writeFile(source, original);
        await writeFile(captured, JSON.stringify(record));
        await saveRecordedStrataTtft(source, captured, output, 1);
        expect(JSON.parse(await readFile(output, "utf8"))).toEqual({
          ...input,
          runs: [
            input.runs[0],
            { ...input.runs[1], metrics: { tps: gap, ttft } },
          ],
        });
        expect(await readFile(source, "utf8")).toBe(original);
        await expect(
          saveRecordedStrataTtft(source, captured, output, 1),
        ).rejects.toMatchObject({ code: "EEXIST" });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it.each([-1, 0, 2, 0.5, NaN])(
    "rejects an invalid or non-Strata run: %s",
    (index) => {
      expect(() => withRecordedStrataTtft(input, measured, index)).toThrow();
    },
  );

  it.each([null, {}, { ...input, schemaVersion: 2 }, { ...input, runs: [] }])(
    "rejects incompatible common JSON",
    (value) => {
      expect(() => withRecordedStrataTtft(value, measured, 1)).toThrow();
    },
  );
});
