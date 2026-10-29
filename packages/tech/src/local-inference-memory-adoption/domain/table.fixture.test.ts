import { describe, expect, it } from "vitest";
import fixture from "../fixtures/example-readings.json";
import { memoryUseCases } from "./catalog";
import { renderMemoryAdoptionTable, type EngineMemoryRow } from "./table";

describe("renderMemoryAdoptionTable against the committed fixture and catalog", () => {
  it("shows NOT-RUN for the three unmeasured engines and a mixed verdict for strata", () => {
    const rows = fixture.readings as unknown as ReadonlyArray<EngineMemoryRow>;
    const table = renderMemoryAdoptionTable(rows, memoryUseCases);

    expect(table).toContain(
      "| ollama | (NOT-RUN) | (NOT-RUN) | undetermined | undetermined | undetermined |",
    );
    expect(table).toContain(
      "| llama.cpp | (NOT-RUN) | (NOT-RUN) | undetermined | undetermined | undetermined |",
    );
    expect(table).toContain(
      "| mlx | (NOT-RUN) | (NOT-RUN) | undetermined | undetermined | undetermined |",
    );
    // Strata's whole-machine readings clear the batch ceiling but exceed the
    // tighter interactive and edge ceilings — a mixed verdict across use
    // cases, not one global ranking.
    expect(table).toContain(
      "| strata | 46637.9 MiB | 31785.0 MiB | reject | adopt | reject |",
    );
  });
});
