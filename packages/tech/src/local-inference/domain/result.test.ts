import { describe, expect, it } from "vitest";
import {
  adoptionTargetRuns,
  engines,
  type Engine,
  type RunPurpose,
} from "./result.js";

type Row = { engine: Engine; purpose: RunPurpose };

describe("adoptionTargetRuns", () => {
  it("keeps only adoption-target rows, in their original order", () => {
    const runs: Row[] = [
      { engine: "ollama", purpose: "adoption-target" },
      { engine: "strata", purpose: "warmup" },
      { engine: "strata", purpose: "adoption-target" },
    ];
    expect(adoptionTargetRuns(runs)).toEqual([
      { engine: "ollama", purpose: "adoption-target" },
      { engine: "strata", purpose: "adoption-target" },
    ]);
  });

  it("returns one adoption-target row per engine even when a warm-up row shares the engine", () => {
    const runs: Row[] = [];
    for (const engine of engines) {
      if (engine === "strata") runs.push({ engine, purpose: "warmup" });
      runs.push({ engine, purpose: "adoption-target" });
    }
    expect(adoptionTargetRuns(runs).map((run) => run.engine)).toEqual(engines);
  });

  it("returns an empty array when every row is a warm-up", () => {
    const runs: Pick<Row, "purpose">[] = [{ purpose: "warmup" }];
    expect(adoptionTargetRuns(runs)).toEqual([]);
  });
});
