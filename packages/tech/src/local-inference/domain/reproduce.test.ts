import { describe, expect, it } from "vitest";
import { safeReproduceCommand } from "./reproduce";
import type { ComparisonSnapshot } from "./snapshot";

const snapshot: ComparisonSnapshot = {
  id: "llama-cpp-8b-q4",
  engineVersion: "llama.cpp b3985",
  model: "llama-3.1-8b-instruct-q4_k_m",
  fixtureVersion: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  verdict: "adopted",
};

describe("safeReproduceCommand", () => {
  it("builds the scoped command from the snapshot's own four fields", () => {
    expect(safeReproduceCommand(snapshot)).toBe(
      "npm run local-inference -- " +
        "--engine-version 'llama.cpp b3985' " +
        "--model 'llama-3.1-8b-instruct-q4_k_m' " +
        "--fixture-version 'fixture-2026-08-01' " +
        "--runner-version 'runner-1.4.0'",
    );
  });

  it("is deterministic for the same snapshot", () => {
    expect(safeReproduceCommand(snapshot)).toBe(safeReproduceCommand(snapshot));
  });

  it("shell-quotes a value containing a single quote", () => {
    const withQuote = { ...snapshot, model: "o'reilly-model" };
    expect(safeReproduceCommand(withQuote)).toContain(
      "--model 'o'\\''reilly-model'",
    );
  });

  it.each([
    ["engineVersion", "api-key-leaked-into-engine-version"],
    ["model", "my-secret-token-model"],
    ["fixtureVersion", "fixture-with-password-in-it"],
    ["runnerVersion", "runner-credential-v2"],
  ] as const)(
    "throws instead of rendering when %s looks secret-like",
    (field, value) => {
      const tainted = { ...snapshot, [field]: value };
      expect(() => safeReproduceCommand(tainted)).toThrow(/secret-like/);
    },
  );

  it("never contains a known vendor credential env var name", () => {
    const command = safeReproduceCommand(snapshot);
    expect(command).not.toMatch(/ANTHROPIC_API_KEY|OPENAI_API_KEY/);
  });
});
