import type { SpeechToSpeechClient } from "./types";
import { realtimeClientFrom, type RealtimeProtocol } from "./realtime";

/**
 * Google Gemini Live (BidiGenerateContent) anti-corruption adapter for
 * speech-to-speech: a WebSocket duplex session configured for AUDIO output, over
 * which one short text turn is committed and the first audio-output chunk is
 * awaited. Pure protocol pieces only; the socket/clock/timeouts belong to the
 * shared `realtime.ts` driver.
 *
 * The input turn is text (`clientContent`) rather than audio — the same control
 * simplification the OpenAI Realtime adapter documents — so the round-trip is
 * reproducible without an audio clip while still measuring time to first spoken
 * audio. The Live API authenticates with the API key in the query string.
 */

const GEMINI_LIVE_URL =
  "wss://generativelanguage.googleapis.com/ws/" +
  "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

/** The Live endpoint with the API key in the query string. */
export const geminiLiveUrl = (apiKey: string): string =>
  `${GEMINI_LIVE_URL}?key=${encodeURIComponent(apiKey)}`;

/** The setup message: fix the model and request AUDIO output modality. */
export const geminiSetupMessage = (apiModelId: string): unknown => ({
  setup: {
    model: apiModelId.startsWith("models/")
      ? apiModelId
      : `models/${apiModelId}`,
    generationConfig: { responseModalities: ["AUDIO"] },
  },
});

/** The client message that commits one short text turn. */
export const geminiTurnMessage = (prompt: string): unknown => ({
  clientContent: {
    turns: [{ role: "user", parts: [{ text: prompt }] }],
    turnComplete: true,
  },
});

/** Ready once the server acknowledges setup. */
export const geminiIsReady = (message: unknown): boolean =>
  (message as { setupComplete?: unknown } | null)?.setupComplete !== undefined;

/**
 * The base64 audio of the first audio part in a `serverContent.modelTurn`, or
 * `undefined`. Total over missing/malformed shapes.
 */
export const geminiFirstAudio = (message: unknown): string | undefined => {
  const content = (message as { serverContent?: unknown } | null)
    ?.serverContent as { modelTurn?: unknown } | null | undefined;
  const parts = (content?.modelTurn as { parts?: unknown } | null | undefined)
    ?.parts;
  if (!Array.isArray(parts)) return undefined;
  for (const part of parts) {
    const inline = (part as { inlineData?: unknown } | null)?.inlineData as
      | { mimeType?: unknown; data?: unknown }
      | null
      | undefined;
    if (
      inline !== null &&
      inline !== undefined &&
      typeof inline.data === "string" &&
      (typeof inline.mimeType !== "string" ||
        inline.mimeType.startsWith("audio"))
    ) {
      return inline.data;
    }
  }
  return undefined;
};

/** A server-reported error string, or `undefined`. */
export const geminiServerError = (message: unknown): string | undefined => {
  const error = (message as { error?: unknown } | null)?.error as
    | { message?: unknown }
    | null
    | undefined;
  if (error === null || error === undefined) return undefined;
  return typeof error.message === "string"
    ? error.message
    : "unspecified Live error";
};

const geminiProtocol = (
  apiModelId: string,
  apiKey: string,
  prompt: string,
): RealtimeProtocol => ({
  model: apiModelId,
  url: geminiLiveUrl(apiKey),
  protocols: [],
  headers: {},
  setupMessages: [geminiSetupMessage(apiModelId)],
  isReady: geminiIsReady,
  turnMessages: [geminiTurnMessage(prompt)],
  firstAudio: geminiFirstAudio,
  serverError: geminiServerError,
});

export const createGeminiSpeechToSpeechClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToSpeechClient =>
  realtimeClientFrom(apiModelId, (prompt) =>
    geminiProtocol(apiModelId, apiKey, prompt),
  );
