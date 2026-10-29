import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeFailure, type FailureEngine } from "./failure.js";
import { failureReproduction } from "./reproduction.js";

const context = {
  modelAlias: "model-1",
  quantization: "Q4_K_M",
  inputFixture: "fixture-2",
  rerunArgv: ["ollama", "run", "private-model", "--config", "/private/config"],
};

describe("failure reproduction metadata", () => {
  it.each<FailureEngine>(["ollama", "llama.cpp", "mlx", "strata"])(
    "retains public conditions for %s across JSON serialization",
    (engine) => {
      const result = JSON.parse(
        JSON.stringify(
          normalizeFailure({
            engine,
            timedOut: true,
            reproduction: context,
          }),
        ),
      );
      expect(result.engine).toBe(engine);
      expect(result.failure.code).toBe("TIMEOUT");
      expect(result.reproduction).toEqual({
        fingerprintVersion: "failure-command/1",
        modelAlias: "model-1",
        quantization: "Q4_K_M",
        inputFixture: "fixture-2",
        commandSha256: createHash("sha256")
          .update(
            JSON.stringify([
              "failure-command/1",
              ["ollama", "run", "[REDACTED]", "--config", "[REDACTED]"],
            ]),
          )
          .digest("hex"),
      });
      expect(result.metrics.ttft.value).toBeNull();
    },
  );

  it.each([
    "sk-test-not-a-real-key",
    "https://user:password@internal/?token=secret",
    "/home/private/model.gguf",
    "C:\\private\\fixture.json",
    "Bearer secret",
    "alice@example.invalid",
    "model-0",
    "model-1000",
    "fixture-1000",
    "model-1\nsecret",
  ])("drops unsafe identity input %j", (value) => {
    const result = failureReproduction({
      modelAlias: value,
      inputFixture: value,
      quantization: value,
    });
    expect(result.modelAlias).toBeNull();
    expect(result.inputFixture).toBeNull();
    expect(result.quantization).toBeNull();
    expect(JSON.stringify(result)).not.toContain(value);
  });

  it("does not persist diagnostics, unknown fields, environment, paths or argv", () => {
    const input = {
      engine: "mlx" as const,
      stderr: "private-error",
      error: new Error("private-message"),
      reproduction: {
        ...context,
        baseUrl: "https://private-host",
        token: "private-token",
      },
    };
    const before = JSON.stringify(input);
    const serialized = JSON.stringify(normalizeFailure(input));
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("rerunArgv");
    expect(JSON.stringify(input)).toBe(before);
  });

  it("redacts secret values before hashing, including values that look public", () => {
    const first = failureReproduction({
      rerunArgv: [
        "/private/bin/node",
        "--config",
        "ollama",
        "--model",
        "strata",
        "API_KEY=first",
        "https://private-one/?token=first",
        "--token=first",
      ],
    });
    const second = failureReproduction({
      rerunArgv: [
        "C:\\other\\node",
        "--config",
        "/other/config",
        "--model",
        "secret-model",
        "API_KEY=second",
        "https://private-two/?token=second",
        "--token=second",
      ],
    });
    expect(first.commandSha256).toBe(second.commandSha256);
  });

  it("distinguishes known command structure and argument boundaries", () => {
    const hash = (rerunArgv: string[]) =>
      failureReproduction({ rerunArgv }).commandSha256;
    expect(hash(["ollama", "run", "secret"])).not.toBe(
      hash(["strata", "run", "secret"]),
    );
    expect(hash(["node", "secret one"])).not.toBe(
      hash(["node", "secret", "one"]),
    );
    expect(hash(["node", "--config", "secret"])).not.toBe(
      hash(["node", "--output", "secret"]),
    );
    expect(hash(["nodejs", "secret"])).toBe(hash(["node", "secret"]));
  });

  it("keeps changed public model, fixture and quantization conditions distinguishable", () => {
    const baseline = failureReproduction(context);
    for (const change of [
      { modelAlias: "model-2" },
      { inputFixture: "fixture-3" },
      { quantization: "fp16" },
    ]) {
      const changed = failureReproduction({ ...context, ...change });
      expect(changed).not.toEqual(baseline);
      expect(changed.commandSha256).toBe(baseline.commandSha256);
    }
  });

  it("marks absent or invalid argv unknown without hashing an empty command", () => {
    expect(failureReproduction().commandSha256).toBeNull();
    expect(failureReproduction({ rerunArgv: [] }).commandSha256).toBeNull();
    expect(
      failureReproduction({ rerunArgv: [42] as unknown as string[] })
        .commandSha256,
    ).toBeNull();
  });

  it("rejects an unrecognized runtime engine without echoing its value", () => {
    expect(() =>
      normalizeFailure({ engine: "private-engine-token" as FailureEngine }),
    ).toThrow(/^Unsupported failure engine$/);
  });
});
