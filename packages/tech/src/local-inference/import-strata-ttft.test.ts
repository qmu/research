import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import measured from "./vendors/fixtures/strata-ttft-warmup.json";
import { attachStrataTtft, importStrataTtft } from "./import-strata-ttft.js";

const common = {
  schemaVersion: 1,
  procedure: "single-request-per-engine",
  sampling: { temperature: 0 },
  runs: [
    { engine: "ollama", metrics: { ttft: { value: 1, unit: "s" } } },
    {
      engine: "strata",
      phase: "warmup",
      model: "fixture-model",
      status: "measured",
      metrics: {
        ttft: { value: null, unit: "s", reason: "NO-FIELD" },
        tps: { value: 12, unit: "tokens/s", source: "client" },
      },
    },
  ],
};

describe("Strata TTFT common JSON import", () => {
  it("persists the fixture answer latency and preserves the original artifact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "strata-ttft-"));
    try {
      const input = join(dir, "common.json");
      const record = join(dir, "record.json");
      const output = join(dir, "result.json");
      await writeFile(input, JSON.stringify(common));
      await writeFile(record, JSON.stringify(measured));
      await importStrataTtft(input, record, output, 1);
      const saved = JSON.parse(await readFile(output, "utf8"));
      expect(saved.runs[1].metrics.ttft).toEqual({
        value: 2.689731,
        unit: "s",
        source: "client",
      });
      expect(saved).toEqual(attachStrataTtft(common, measured, 1));
      expect(saved.runs[0]).toEqual(common.runs[0]);
      expect(saved.runs[1].metrics.tps).toEqual(common.runs[1]?.metrics.tps);
      expect(saved.runs[1].phase).toBe("warmup");
      expect(JSON.parse(await readFile(input, "utf8"))).toEqual(common);
      await expect(
        importStrataTtft(input, record, output, 1),
      ).rejects.toThrow();
      await expect(importStrataTtft(input, record, input, 1)).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("subtracts a nonzero dispatch offset", () => {
    const saved = attachStrataTtft(
      common,
      {
        ...measured,
        dispatch_offset_s: 10,
        first_answer_offset_s: 12.5,
      },
      1,
    );
    expect(saved.runs[1]).toMatchObject({ metrics: { ttft: { value: 2.5 } } });
  });

  it.each([undefined, null, -1, "1", Infinity])(
    "persists missing or failed measurements (%s)",
    (offset) => {
      const saved = attachStrataTtft(
        common,
        { ...measured, first_answer_offset_s: offset },
        1,
      );
      expect(saved.runs[1]).toMatchObject({
        metrics: {
          ttft: {
            value: null,
            unit: "s",
            reason: offset === undefined ? "NO-FIELD" : "MEASURE-FAILED",
          },
        },
      });
    },
  );

  it.each([-1, 0, 2, 1.5, NaN])(
    "rejects an invalid or non-Strata selection %s",
    (index) => {
      expect(() => attachStrataTtft(common, measured, index)).toThrow();
    },
  );

  it.each([
    null,
    {},
    { ...common, schemaVersion: 2 },
    { ...common, runs: [{}] },
  ])("rejects malformed common JSON", (input) => {
    expect(() => attachStrataTtft(input, measured, 0)).toThrow();
  });
});
