import { describe, expect, it, vi } from "vitest";
import { publishKnownEngineRows, validateAdoptionEngines } from "./guard.js";

const runner = { engines: ["ollama", "llama.cpp", "mlx", "strata"] };

describe("runner engine membership before adoption publication", () => {
  it("publishes all defined engines once, preserving data and order", async () => {
    const rows = Object.freeze(
      [...runner.engines]
        .reverse()
        .map((engine) => Object.freeze({ engine, adopted: false })),
    );
    const publish = vi.fn();
    expect(await publishKnownEngineRows(rows, runner, publish)).toEqual({
      ok: true,
    });
    expect(publish).toHaveBeenCalledExactlyOnceWith(rows);
  });

  it.each(["unknown", "Ollama", "llama-cpp", "toString", "__proto__"])(
    "rejects %s even after a valid row, without publishing a prefix",
    async (engine) => {
      const publish = vi.fn();
      expect(
        await publishKnownEngineRows(
          [{ engine: "ollama" }, { engine }],
          runner,
          publish,
        ),
      ).toEqual({ ok: false, reason: "UNKNOWN-ADOPTION-ENGINE" });
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it("uses runner definitions, not a hard-coded engine list or row metadata", () => {
    expect(
      validateAdoptionEngines([{ engine: "new-engine" }], {
        engines: ["new-engine"],
      }),
    ).toEqual({ ok: true });
    expect(
      validateAdoptionEngines([{ engine: "strata", engines: ["strata"] }], {
        engines: ["ollama"],
      }),
    ).toEqual({ ok: false, reason: "UNKNOWN-ADOPTION-ENGINE" });
  });

  it.each([
    null,
    {},
    [],
    { engines: [] },
    { engines: "ollama" },
    { engines: [""] },
    { engines: [" ollama"] },
    { engines: [1] },
    { engines: ["mlx", "mlx"] },
  ])("fails closed for invalid runner %j", async (definition) => {
    const publish = vi.fn();
    expect(
      await publishKnownEngineRows([{ engine: "ollama" }], definition, publish),
    ).toEqual({ ok: false, reason: "INVALID-RUNNER-DEFINITION" });
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    "ollama",
    [null],
    [[]],
    [{}],
    [{ engine: "" }],
    [{ engine: "mlx " }],
    [{ engine: 1 }],
  ])("rejects malformed artifact %j", (rows) => {
    expect(validateAdoptionEngines(rows, runner)).toEqual({
      ok: false,
      reason: "INVALID-ADOPTION-ENGINE",
    });
  });

  it("keeps reason precedence independent of row order", () => {
    for (const rows of [
      [{ engine: "unknown" }, {}],
      [{}, { engine: "unknown" }],
    ]) {
      expect(validateAdoptionEngines(rows, runner)).toEqual({
        ok: false,
        reason: "INVALID-ADOPTION-ENGINE",
      });
      expect(validateAdoptionEngines(rows, {})).toEqual({
        ok: false,
        reason: "INVALID-RUNNER-DEFINITION",
      });
    }
  });

  it("allows subsets, repeated known engines and empty batches", () => {
    for (const rows of [
      [],
      [{ engine: "mlx" }],
      [{ engine: "mlx" }, { engine: "mlx" }],
    ])
      expect(validateAdoptionEngines(rows, runner)).toEqual({ ok: true });
  });

  it("awaits the publisher and propagates publication failures", async () => {
    const error = new Error("sink failed");
    await expect(
      publishKnownEngineRows([{ engine: "mlx" }], runner, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
