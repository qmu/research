import type { Observation } from "../domain/result.js";

export type StreamFailureReason =
  | "HTTP-ERROR"
  | "NO-BODY"
  | "INVALID-STREAM"
  | "STREAM-ERROR"
  | "INCOMPLETE-STREAM";

const streamFailures = new WeakMap<Error, StreamFailureReason>();

/** Fixed codes only: never retain response content or raw exception messages. */
function streamFailure(reason: StreamFailureReason): Error {
  const error = new Error(reason);
  streamFailures.set(error, reason);
  return error;
}

export function streamFailureReason(
  error: unknown,
): StreamFailureReason | undefined {
  return error instanceof Error ? streamFailures.get(error) : undefined;
}

/** Only content deltas mark token times: role, usage and DONE frames do not. */
export async function observeStream(
  response: Response,
  started: number,
  now = () => performance.now(),
): Promise<Observation> {
  if (!response.ok) throw streamFailure("HTTP-ERROR");
  if (!response.body) throw streamFailure("NO-BODY");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const observation: Observation = {};
  let buffer = "";
  let data: string[] = [];
  function event(): boolean {
    const payload = data.join("\n");
    data = [];
    if (!payload) return false;
    if (payload === "[DONE]") return true;
    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      throw streamFailure("INVALID-STREAM");
    }
    if (!chunk || typeof chunk !== "object" || Array.isArray(chunk))
      throw streamFailure("INVALID-STREAM");
    if (chunk.error) throw streamFailure("STREAM-ERROR");
    const content = chunk.choices?.[0]?.delta?.content;
    if (typeof content === "string" && content.length > 0) {
      const elapsed = now() - started;
      observation.firstMs ??= elapsed;
      observation.lastMs = elapsed;
    }
    const tokens = chunk.usage?.completion_tokens;
    if (Number.isInteger(tokens) && tokens >= 0)
      observation.completionTokens = tokens;
    return false;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw streamFailure("INCOMPLETE-STREAM");
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line === "") {
          if (event()) return observation;
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
