import { describe, expect, it } from "vitest";
import { parseReadings } from "./readings.js";

function validDocument() {
  const row = {
    ttft: { value: 1, unit: "s" },
    tps: { value: 20, unit: "tokens/s" },
    quality: { value: 0.8, unit: "ratio" },
    peakRss: { value: null, reason: "NOT-RUN" },
  };
  return {
    readings: { ollama: row, "llama.cpp": row, mlx: row, strata: row },
  };
}

describe("parseReadings", () => {
  it("parses a valid document for all four engines", () => {
    const result = parseReadings(validDocument());
    const engineKeys = Object.keys(result).sort();
    expect(engineKeys).toEqual(["llama.cpp", "mlx", "ollama", "strata"]);
    expect(result.ollama.peakRss).toEqual({ value: null, reason: "NOT-RUN" });
  });

  it("rejects a document missing an engine", () => {
    const document = validDocument();
    const { strata: _omitted, ...rest } = document.readings;
    const parse = () => parseReadings({ readings: rest });
    expect(parse).toThrow(/missing engine "strata"/);
  });

  it("rejects an unknown engine key", () => {
    const document = validDocument();
    const parse = () =>
      parseReadings({
        readings: { ...document.readings, vllm: document.readings.ollama },
      });
    expect(parse).toThrow(/unknown engine "vllm"/);
  });

  it("rejects a row missing a metric", () => {
    const document = validDocument();
    const { tps: _omitted, ...rest } = document.readings.ollama;
    const parse = () =>
      parseReadings({ readings: { ...document.readings, ollama: rest } });
    expect(parse).toThrow(/missing metric "tps"/);
  });

  it("rejects a missing reading without a known reason", () => {
    const document = validDocument();
    const badOllama = { ...document.readings.ollama, tps: { value: null } };
    const parse = () =>
      parseReadings({ readings: { ...document.readings, ollama: badOllama } });
    expect(parse).toThrow(/known "reason"/);
  });

  it("rejects a non-finite value", () => {
    const document = validDocument();
    const badOllama = {
      ...document.readings.ollama,
      tps: { value: Number.NaN, unit: "tokens/s" },
    };
    const parse = () =>
      parseReadings({ readings: { ...document.readings, ollama: badOllama } });
    expect(parse).toThrow(/finite number/);
  });
});
