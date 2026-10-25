import { describe, expect, it } from "vitest";
import fixture from "../fixtures/example-rows.json";
import { renderMemoryMarginTable } from "./table";
import type { EngineMemoryMarginRow } from "./types";

describe("renderMemoryMarginTable against the committed fixture", () => {
  it("shows NOT-RUN for three engines and a real margin for strata", () => {
    const rows =
      fixture.rows as unknown as ReadonlyArray<EngineMemoryMarginRow>;
    const table = renderMemoryMarginTable(rows);

    expect(table).toContain("| ollama | (NOT-RUN) | (NOT-RUN) | (NOT-RUN) |");
    expect(table).toContain(
      "| llama.cpp | (NOT-RUN) | (NOT-RUN) | (NOT-RUN) |",
    );
    expect(table).toContain("| mlx | (NOT-RUN) | (NOT-RUN) | (NOT-RUN) |");
    // 65000 raw MiB buckets to the 64 GiB tier (65536); 65536 - 46637.9.
    expect(table).toContain(
      "| strata | (NOT-RUN) | (NOT-RUN) | +18898.1 MiB margin (64 GiB) |",
    );
  });
});
