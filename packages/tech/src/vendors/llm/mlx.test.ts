import { describe, expect, it } from "vitest";
import {
  createMlxCompletionClient,
  extractMlxGeneratedText,
  normalizeMlxGenerateOutput,
  parseMlxGenerateStats,
  type MlxGenerateRequest,
} from "./mlx";
import {
  MLX_GENERATE_FIXTURE_MULTILINE,
  MLX_GENERATE_FIXTURE_SHORT,
} from "./mlx.fixture";

describe("parseMlxGenerateStats", () => {
  it("reads the Prompt/Generation/Peak memory block of a short run", () => {
    expect(parseMlxGenerateStats(MLX_GENERATE_FIXTURE_SHORT)).toEqual({
      promptTokens: 28,
      promptTokensPerSecond: 214.552,
      generationTokens: 9,
      generationTokensPerSecond: 71.063,
      peakMemoryGb: 4.129,
    });
  });

  it("reads the stats block regardless of how long the generated text is", () => {
    expect(parseMlxGenerateStats(MLX_GENERATE_FIXTURE_MULTILINE)).toEqual({
      promptTokens: 12,
      promptTokensPerSecond: 301.884,
      generationTokens: 47,
      generationTokensPerSecond: 58.217,
      peakMemoryGb: 6.774,
    });
  });

  it("throws when the stats block is missing", () => {
    expect(() =>
      parseMlxGenerateStats("==========\nhello\n==========\n"),
    ).toThrow(/stats block/);
  });

  it("throws when only part of the stats block is present", () => {
    const partial = [
      "==========",
      "hello",
      "==========",
      "Prompt: 5 tokens, 100.000 tokens-per-sec",
      "Generation: 5 tokens, 50.000 tokens-per-sec",
      // Peak memory line omitted.
    ].join("\n");
    expect(() => parseMlxGenerateStats(partial)).toThrow(/stats block/);
  });
});

describe("extractMlxGeneratedText", () => {
  it("extracts a single-line reply framed by the separator lines", () => {
    expect(extractMlxGeneratedText(MLX_GENERATE_FIXTURE_SHORT)).toBe(
      "Paris is the capital of France.",
    );
  });

  it("extracts a multi-paragraph reply, blank lines included", () => {
    expect(extractMlxGeneratedText(MLX_GENERATE_FIXTURE_MULTILINE)).toBe(
      "Mixed-precision training keeps most tensors in a lower-precision format while\n" +
        "accumulating sums in a higher-precision one.\n" +
        "\n" +
        "This trades a small amount of numerical range for roughly half the memory\n" +
        "traffic, which is why it speeds up both training and inference on modern\n" +
        "accelerators.",
    );
  });

  it("throws when the closing separator is missing", () => {
    expect(() =>
      extractMlxGeneratedText("==========\nonly one separator\n"),
    ).toThrow(/==========/);
  });
});

describe("normalizeMlxGenerateOutput", () => {
  it("normalizes a short run into a provider-neutral StreamedCompletion", () => {
    const result = normalizeMlxGenerateOutput(
      MLX_GENERATE_FIXTURE_SHORT,
      "mlx-community/Llama-3.2-3B-Instruct-4bit",
    );
    const expectedTtftMs = (28 / 214.552) * 1000;
    const expectedGenerationMs = (9 / 71.063) * 1000;
    expect(result.text).toBe("Paris is the capital of France.");
    expect(result.outputTokens).toBe(9);
    expect(result.model).toBe("mlx-community/Llama-3.2-3B-Instruct-4bit");
    expect(result.ttftMs).toBeCloseTo(expectedTtftMs, 6);
    expect(result.elapsedMs).toBeCloseTo(
      expectedTtftMs + expectedGenerationMs,
      6,
    );
  });

  it("reports elapsedMs as the whole request end to end (ADR 0009), not just generation", () => {
    const result = normalizeMlxGenerateOutput(
      MLX_GENERATE_FIXTURE_MULTILINE,
      "fixture-model",
    );
    expect(result.elapsedMs).toBeGreaterThan(result.ttftMs ?? 0);
    expect(result.outputTokens).toBe(47);
  });

  it("does not divide by zero when the prompt or generation stats report zero tokens", () => {
    const raw = `==========
ok
==========
Prompt: 0 tokens, 0.000 tokens-per-sec
Generation: 0 tokens, 0.000 tokens-per-sec
Peak memory: 1.000 GB
`;
    const result = normalizeMlxGenerateOutput(raw, "fixture-model");
    expect(result.ttftMs).toBe(0);
    expect(result.elapsedMs).toBe(0);
    expect(result.outputTokens).toBe(0);
  });
});

describe("createMlxCompletionClient", () => {
  const model = "mlx-community/Llama-3.2-3B-Instruct-4bit";

  it("completeStreaming runs the injected runner and normalizes its captured stdout", async () => {
    const requests: MlxGenerateRequest[] = [];
    const client = createMlxCompletionClient(model, async (request) => {
      requests.push(request);
      return MLX_GENERATE_FIXTURE_SHORT;
    });
    const result = await client.completeStreaming(
      "What is the capital of France?",
    );
    const expectedTtftMs = (28 / 214.552) * 1000;
    const expectedGenerationMs = (9 / 71.063) * 1000;
    expect(result.text).toBe("Paris is the capital of France.");
    expect(result.outputTokens).toBe(9);
    expect(result.model).toBe(model);
    expect(result.ttftMs).toBeCloseTo(expectedTtftMs, 6);
    expect(result.elapsedMs).toBeCloseTo(
      expectedTtftMs + expectedGenerationMs,
      6,
    );
    // Connects the port to the process boundary with the model and prompt it was
    // given, and a default generation window when the caller states none.
    expect(requests).toEqual([
      { model, prompt: "What is the capital of France?", maxTokens: 512 },
    ]);
  });

  it("complete runs the same path but drops ttftMs, returning the plain Completion shape", async () => {
    const client = createMlxCompletionClient(
      model,
      async () => MLX_GENERATE_FIXTURE_MULTILINE,
    );
    const result = await client.complete("Explain mixed precision.");
    const expectedTtftMs = (12 / 301.884) * 1000;
    const expectedGenerationMs = (47 / 58.217) * 1000;
    expect(result.outputTokens).toBe(47);
    expect(result.model).toBe(model);
    expect(result.elapsedMs).toBeCloseTo(
      expectedTtftMs + expectedGenerationMs,
      6,
    );
    expect(Object.keys(result).sort()).toEqual([
      "elapsedMs",
      "model",
      "outputTokens",
      "text",
    ]);
  });

  it("forwards a caller-supplied maxTokens to the runner instead of the default", async () => {
    const requests: MlxGenerateRequest[] = [];
    const client = createMlxCompletionClient(model, async (request) => {
      requests.push(request);
      return MLX_GENERATE_FIXTURE_SHORT;
    });
    await client.completeStreaming("prompt", { maxTokens: 64 });
    expect(requests[0].maxTokens).toBe(64);
  });

  it("propagates a failed process launch instead of swallowing it", async () => {
    const client = createMlxCompletionClient(model, async () => {
      throw new Error("mlx_lm.generate exited with code 1: model not found");
    });
    await expect(client.completeStreaming("prompt")).rejects.toThrow(
      /exited with code 1/,
    );
    await expect(client.complete("prompt")).rejects.toThrow(
      /exited with code 1/,
    );
  });

  it("propagates a malformed-capture failure reason from the normalizer", async () => {
    const client = createMlxCompletionClient(
      model,
      async () => "==========\nhello\n==========\n",
    );
    await expect(client.completeStreaming("prompt")).rejects.toThrow(
      /stats block/,
    );
  });

  it("surfaces completeStructured as an unsupported-capability failure, never a faked conformance", async () => {
    const client = createMlxCompletionClient(model, async () => {
      throw new Error("the runner must not be called for completeStructured");
    });
    await expect(
      client.completeStructured("prompt", { type: "object" }),
    ).rejects.toThrow(/no structured-output feature/);
  });
});
