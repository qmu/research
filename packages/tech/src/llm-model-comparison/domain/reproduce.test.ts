import { describe, expect, it } from "vitest";
import { safeReproduceCommand } from "./reproduce";

describe("safeReproduceCommand", () => {
  it("builds a --configs command from each config's id and effort", () => {
    expect(
      safeReproduceCommand({
        configs: [
          { id: "claude-opus-4-8", effort: "high" },
          { id: "gpt-6", effort: "low" },
        ],
        trials: 3,
      }),
    ).toBe(
      "npm run compare -- --configs claude-opus-4-8:high,gpt-6:low --trials 3",
    );
  });

  it("omits --configs when the artifact carries no configurations", () => {
    expect(safeReproduceCommand({ configs: [], trials: 3 })).toBe(
      "npm run compare -- --trials 3",
    );
  });

  it("clamps a non-positive or fractional trial count to an integer", () => {
    expect(
      safeReproduceCommand({
        configs: [{ id: "claude-opus-4-8", effort: "high" }],
        trials: 0,
      }),
    ).toBe("npm run compare -- --configs claude-opus-4-8:high --trials 1");
    expect(
      safeReproduceCommand({
        configs: [{ id: "claude-opus-4-8", effort: "high" }],
        trials: 2.9,
      }),
    ).toBe("npm run compare -- --configs claude-opus-4-8:high --trials 2");
  });

  it("keeps the no-effort sentinel verbatim as a public label", () => {
    expect(
      safeReproduceCommand({
        configs: [{ id: "model-with-no-effort-axis", effort: "n/a" }],
        trials: 1,
      }),
    ).toBe(
      "npm run compare -- --configs model-with-no-effort-axis:n/a --trials 1",
    );
  });

  it("never contains any known vendor credential env var name", () => {
    const command = safeReproduceCommand({
      configs: [
        { id: "claude-opus-4-8", effort: "high" },
        { id: "gpt-6", effort: "low" },
      ],
      trials: 5,
    });
    for (const secretEnvVar of [
      "ANTHROPIC_API_KEY",
      "OPENAI_API_KEY",
      "GOOGLE_API_KEY",
      "AWS_PROFILE",
      "CLOUDFLARE_API_TOKEN",
    ]) {
      expect(command).not.toContain(secretEnvVar);
    }
  });

  it("throws when a config id itself reads as secret-like", () => {
    expect(() =>
      safeReproduceCommand({
        configs: [{ id: "leaked-api-key", effort: "low" }],
        trials: 1,
      }),
    ).toThrow(/secret-like/);
  });
});
