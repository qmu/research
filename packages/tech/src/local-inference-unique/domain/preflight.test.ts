import { describe, expect, it, vi } from "vitest";
import {
  compareUniqueInference,
  preflightUniqueInference,
} from "./preflight.js";

const artifact = (runId = "synthetic-run", version = 1, engine = "mlx") => ({
  schemaVersion: 1,
  execution: { runId, version },
  runs: [{ engine, model: "fixture", metrics: {} }],
});

describe("saved inference uniqueness boundary", () => {
  it("rejects repeated rows even when metrics and model disagree, before rendering", () => {
    const input = artifact();
    input.runs.push({ engine: "mlx", model: "other", metrics: { tps: 99 } });
    const before = JSON.stringify(input);
    const render = vi.fn();
    expect(() => compareUniqueInference([input], render)).toThrow(
      /^DUPLICATE-INFERENCE-ROW$/,
    );
    expect(render).not.toHaveBeenCalled();
    expect(JSON.stringify(input)).toBe(before);
  });

  it("rejects duplicates across files in either order without partial rendering", () => {
    const a = artifact();
    const b = artifact();
    for (const saved of [
      [a, artifact("other"), b],
      [b, a],
    ]) {
      const render = vi.fn();
      expect(() => compareUniqueInference(saved, render)).toThrow(
        /^DUPLICATE-INFERENCE-ROW$/,
      );
      expect(render).not.toHaveBeenCalled();
    }
  });

  it("keeps distinct run IDs, engines and execution versions", () => {
    const saved = [
      artifact(),
      artifact("other"),
      artifact("synthetic-run", 2),
      artifact("synthetic-run", 1, "ollama"),
    ];
    const render = vi.fn(() => "comparison");
    expect(compareUniqueInference(saved, render)).toBe("comparison");
    expect(render).toHaveBeenCalledExactlyOnceWith(saved);
  });

  it("does not collide on delimiter-containing identities", () => {
    expect(() =>
      preflightUniqueInference([
        artifact("a|b", 1, "c"),
        artifact("a", 1, "b|c"),
      ]),
    ).not.toThrow();
  });

  it.each([
    null,
    {},
    { ...artifact(), schemaVersion: 2 },
    { ...artifact(), runs: [null] },
    { ...artifact(), runs: [{ engine: " " }] },
    ...[undefined, 0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1].map(
      (version) => ({ ...artifact(), execution: { runId: "x", version } }),
    ),
    { ...artifact(), execution: { runId: "", version: 1 } },
  ])("fails closed on missing or invalid identity: %j", (input) => {
    const render = vi.fn();
    expect(() => compareUniqueInference([input], render)).toThrow(
      /^INVALID-INFERENCE-IDENTITY$/,
    );
    expect(render).not.toHaveBeenCalled();
  });
});
