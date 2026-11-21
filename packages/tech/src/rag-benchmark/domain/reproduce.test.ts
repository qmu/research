import { describe, expect, it } from "vitest";
import { safeReproduceCommand } from "./reproduce";

describe("safeReproduceCommand", () => {
  it("builds the fixture command for the default (mini) dataset", () => {
    expect(
      safeReproduceCommand({
        fixture: true,
        datasetId: "scifact-mini",
        trials: 5,
      }),
    ).toBe("npm run rag -- --fixture --trials 5");
  });

  it("adds --corpus scifact for the real BEIR subset dataset", () => {
    expect(
      safeReproduceCommand({
        fixture: false,
        datasetId: "scifact-beir-subset",
        trials: 3,
      }),
    ).toBe("npm run rag -- --corpus scifact --trials 3");
  });

  it("clamps a non-positive or fractional trial count to a positive integer", () => {
    expect(
      safeReproduceCommand({
        fixture: true,
        datasetId: "scifact-mini",
        trials: 0,
      }),
    ).toBe("npm run rag -- --fixture --trials 1");
    expect(
      safeReproduceCommand({
        fixture: true,
        datasetId: "scifact-mini",
        trials: 2.9,
      }),
    ).toBe("npm run rag -- --fixture --trials 2");
  });

  it("never echoes an unrecognized dataset id into the command", () => {
    const command = safeReproduceCommand({
      fixture: false,
      datasetId: "some-other-dataset",
      trials: 1,
    });
    expect(command).toBe("npm run rag -- --trials 1");
    expect(command).not.toContain("some-other-dataset");
  });

  it("never contains any known vendor credential env var name", () => {
    const command = safeReproduceCommand({
      fixture: false,
      datasetId: "scifact-beir-subset",
      trials: 5,
    });
    for (const secretEnvVar of [
      "OPENAI_API_KEY",
      "AWS_PROFILE",
      "AWS_ACCESS_KEY_ID",
      "CLOUDFLARE_API_TOKEN",
    ]) {
      expect(command).not.toContain(secretEnvVar);
    }
  });
});
