import type { SynthesizedSpeech, TextToSpeechClient } from "./types";

/**
 * ElevenLabs anti-corruption adapter for the speech topic's text-to-speech port.
 * The single-shot REST endpoint returns audio bytes directly, so the whole call
 * is in-memory and resource-free, matching the instrument's estimate premise.
 * Every ElevenLabs-specific fact — the `xi-api-key` header, the voice id in the
 * path, the `model_id` body field, the mp3 output format — is kept here, never
 * in `domain/` or the entrypoint. Latency is measured inside the call so it is
 * comparable across providers.
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

/**
 * Default synthesis voice (ElevenLabs "Rachel", a stock public voice). The topic
 * scores intelligibility, not a specific voice, so the choice only needs to be
 * fixed and reproducible; changing it is an instrument decision, not a silent
 * swap. Voice cloning / prosody are explicitly out of the mission's scope.
 */
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** The audio format requested; mp3 keeps the response small and the STT judge
 * reads it directly. */
const OUTPUT_FORMAT = "mp3_44100_128";

export type ElevenLabsRequest = Readonly<{
  url: string;
  headers: Readonly<Record<string, string>>;
  body: string;
}>;

/** Pure request builder — exported so URL/header/body construction is unit-tested
 * without a network call. */
export const elevenLabsSynthesisRequest = (
  apiModelId: string,
  text: string,
  apiKey: string,
  voiceId: string = DEFAULT_ELEVENLABS_VOICE_ID,
): ElevenLabsRequest => ({
  url: `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
  headers: {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "audio/mpeg",
  },
  body: JSON.stringify({ text, model_id: apiModelId }),
});

export const createElevenLabsTextToSpeechClient = (
  apiModelId: string,
  apiKey: string,
  voiceId: string = DEFAULT_ELEVENLABS_VOICE_ID,
): TextToSpeechClient => ({
  model: apiModelId,
  synthesize: async (text): Promise<SynthesizedSpeech> => {
    const request = elevenLabsSynthesisRequest(
      apiModelId,
      text,
      apiKey,
      voiceId,
    );
    const started = performance.now();
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
    });
    if (!response.ok) {
      throw new Error(
        `ElevenLabs TTS ${apiModelId} failed: ${response.status} ${await response.text()}`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      audio: { base64: bytes.toString("base64"), mimeType: "audio/mpeg" },
      elapsedMs: performance.now() - started,
      model: apiModelId,
    };
  },
});
