/** JSON-safe result for imported local-engine measurements. Missing is never zero. */
export type LocalInferenceResult = Readonly<{
  engine: string;
  model: string;
  text: string;
  finishReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  elapsedMs: number | null;
  ttftMs: number | null;
  runtime: Readonly<{
    promptMs: number | null;
    generationMs: number | null;
    tokensPerSecond: number | null;
  }>;
}>;

export type ClientMeasurement = Readonly<{
  elapsedMs: number;
  ttftMs?: number | null;
}>;

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const number = (value: unknown, integer = false): number | null =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  (!integer || Number.isInteger(value))
    ? value
    : null;

/** Import a completed /completion or non-streaming /v1/chat/completions JSON.
 * Transport/SSE decoding belongs to the caller. Server timings are cross-checks,
 * never substitutes for client wall-clock measurements.
 */
export const normalizeLlamaCpp = (
  response: unknown,
  measurement?: ClientMeasurement,
): LocalInferenceResult => {
  const root = object(response);
  if (root.error !== undefined)
    throw new Error("llama.cpp server returned an error");
  if (root.stop === false)
    throw new Error("Expected a completed llama.cpp response");
  const chat = Array.isArray(root.choices);
  const choices = chat ? (root.choices as unknown[]) : [];
  if (chat && choices.length !== 1)
    throw new Error("Expected exactly one llama.cpp completion choice");
  const choice = object(choices[0]);
  const text = chat ? object(choice.message).content : root.content;
  if (
    typeof root.model !== "string" ||
    root.model.trim() === "" ||
    typeof text !== "string"
  )
    throw new Error(
      "Expected a completed llama.cpp response with model and text",
    );
  const usage = object(root.usage);
  const timings = object(root.timings);
  const elapsedMs = number(measurement?.elapsedMs);
  const ttftMs = number(measurement?.ttftMs);
  if (
    measurement &&
    (elapsedMs === null ||
      (measurement.ttftMs !== null &&
        measurement.ttftMs !== undefined &&
        (ttftMs === null || ttftMs > elapsedMs)))
  )
    throw new Error("Invalid client measurement");
  return {
    engine: "llama.cpp",
    model: root.model,
    text,
    finishReason: chat
      ? typeof choice.finish_reason === "string"
        ? choice.finish_reason
        : null
      : typeof root.stop_type === "string"
        ? root.stop_type
        : null,
    inputTokens: number(
      chat ? usage.prompt_tokens : root.tokens_evaluated,
      true,
    ),
    outputTokens: number(
      chat ? usage.completion_tokens : root.tokens_predicted,
      true,
    ),
    elapsedMs,
    ttftMs,
    runtime: {
      promptMs: number(timings.prompt_ms),
      generationMs: number(timings.predicted_ms),
      tokensPerSecond: number(timings.predicted_per_second),
    },
  };
};
