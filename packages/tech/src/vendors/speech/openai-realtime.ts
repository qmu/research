import type { SpeechToSpeechClient } from "./types";
import { realtimeClientFrom, type RealtimeProtocol } from "./realtime";

/**
 * OpenAI Realtime (GPT Realtime) anti-corruption adapter for speech-to-speech:
 * a WebSocket duplex session over which one short text turn is committed and the
 * first audio-output chunk is awaited. Only the pure protocol pieces live here
 * (URL, headers, message shapes, the ready/first-audio/error recognizers); the
 * socket, clock, and timeouts are the shared `realtime.ts` driver's.
 *
 * The input turn is text (`input_text`) rather than audio: a control
 * simplification that keeps the round-trip reproducible without committing an
 * audio clip, while still exercising the realtime pipeline and measuring the
 * property that matters for a voice agent — time to first spoken audio.
 */

const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime";

/** The realtime endpoint for a model id. */
export const openAiRealtimeUrl = (apiModelId: string): string =>
  `${OPENAI_REALTIME_URL}?model=${encodeURIComponent(apiModelId)}`;

/** GA auth is the bearer token alone. The former `OpenAI-Beta: realtime=v1`
 * header now selects the retired Beta protocol and is rejected ("The Realtime
 * Beta API is no longer supported. Please use /v1/realtime for the GA API"), so
 * it must not be sent. */
export const openAiRealtimeHeaders = (
  apiKey: string,
): Readonly<Record<string, string>> => ({
  Authorization: `Bearer ${apiKey}`,
});

/** The two client messages that commit one short text turn and ask for an audio
 * response. The GA API names the field `output_modalities` (the retired Beta
 * `response.modalities` is rejected as an unknown parameter). */
export const openAiTurnMessages = (prompt: string): ReadonlyArray<unknown> => [
  {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: prompt }],
    },
  },
  { type: "response.create", response: { output_modalities: ["audio"] } },
];

/** The session is ready for input once the server has created the session. */
export const openAiIsReady = (message: unknown): boolean =>
  typeof (message as { type?: unknown } | null)?.type === "string" &&
  (message as { type: string }).type === "session.created";

/**
 * The base64 audio of an audio-output delta, or `undefined`. Tolerant of the
 * GA rename — matches any `*.audio*.delta` event carrying a string `delta`
 * (both `response.audio.delta` and `response.output_audio.delta`).
 */
export const openAiFirstAudio = (message: unknown): string | undefined => {
  const m = message as { type?: unknown; delta?: unknown } | null;
  if (m === null || typeof m.type !== "string") return undefined;
  const isAudioDelta = m.type.includes("audio") && m.type.endsWith(".delta");
  return isAudioDelta && typeof m.delta === "string" ? m.delta : undefined;
};

/** A server-reported error message, or `undefined`. */
export const openAiServerError = (message: unknown): string | undefined => {
  const m = message as { type?: unknown; error?: unknown } | null;
  if (m === null || m.type !== "error") return undefined;
  const error = m.error as { message?: unknown } | null;
  const detail =
    error !== null && typeof error?.message === "string"
      ? error.message
      : "unspecified realtime error";
  return detail;
};

const openAiProtocol = (
  apiModelId: string,
  apiKey: string,
  prompt: string,
): RealtimeProtocol => ({
  model: apiModelId,
  url: openAiRealtimeUrl(apiModelId),
  protocols: [],
  headers: openAiRealtimeHeaders(apiKey),
  setupMessages: [],
  isReady: openAiIsReady,
  turnMessages: openAiTurnMessages(prompt),
  firstAudio: openAiFirstAudio,
  serverError: openAiServerError,
});

export const createOpenAiSpeechToSpeechClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToSpeechClient =>
  realtimeClientFrom(apiModelId, (prompt) =>
    openAiProtocol(apiModelId, apiKey, prompt),
  );
