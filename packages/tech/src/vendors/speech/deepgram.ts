import type {
  AudioClip,
  SpeechToTextClient,
  SynthesizedSpeech,
  TextToSpeechClient,
  Transcription,
} from "./types";

/**
 * Deepgram anti-corruption adapters for the speech topic: the Speak
 * (text-to-speech, Aura) and Listen (speech-to-text, Nova) REST endpoints,
 * behind the neutral ports. Both are single-shot and in-memory — Speak returns
 * audio bytes, Listen takes raw audio bytes and returns JSON — so no persistent
 * provider resource is created. Deepgram-specific facts (the `Authorization:
 * Token` scheme, concrete voice-model names, the nested transcript shape,
 * punctuation/format flags) stay inside this ACL.
 */

const DEEPGRAM_BASE = "https://api.deepgram.com/v1";

/** The concrete Aura-2 voice the registry's `aura-2` card synthesizes with.
 * Fixed for reproducibility; the topic scores intelligibility, not a voice. */
export const DEFAULT_AURA_VOICE = "aura-2-thalia-en";

/** Map a registry `apiModelId` to a concrete Deepgram Speak voice model. */
export const deepgramSpeakModel = (apiModelId: string): string =>
  apiModelId === "aura-2" ? DEFAULT_AURA_VOICE : apiModelId;

/** Speak request URL. mp3 keeps the response small and the STT judge reads it. */
export const deepgramSpeakUrl = (apiModelId: string): string =>
  `${DEEPGRAM_BASE}/speak?model=${deepgramSpeakModel(apiModelId)}&encoding=mp3`;

/**
 * Listen request URL. Punctuation and smart-formatting are disabled so the
 * transcript is a bare token stream — punctuation/casing would corrupt the
 * mechanical word-accuracy match the domain computes, the same reason the
 * manifest is numeral-free.
 */
export const deepgramListenUrl = (apiModelId: string): string =>
  `${DEEPGRAM_BASE}/listen?model=${apiModelId}&punctuate=false&smart_format=false`;

/**
 * Pure extractor for the Listen response: read the first channel's first
 * alternative transcript. Total over missing/malformed fields (returns "").
 * Exported so it is unit-tested against recorded shapes without a network call.
 */
export const extractDeepgramTranscript = (raw: unknown): string => {
  if (raw === null || typeof raw !== "object") return "";
  const results = (raw as { results?: unknown }).results;
  if (results === null || typeof results !== "object") return "";
  const channels = (results as { channels?: unknown }).channels;
  if (!Array.isArray(channels) || channels.length === 0) return "";
  const first = channels[0] as { alternatives?: unknown };
  const alternatives = first.alternatives;
  if (!Array.isArray(alternatives) || alternatives.length === 0) return "";
  const transcript = (alternatives[0] as { transcript?: unknown }).transcript;
  return typeof transcript === "string" ? transcript : "";
};

export const createDeepgramTextToSpeechClient = (
  apiModelId: string,
  apiKey: string,
): TextToSpeechClient => ({
  model: apiModelId,
  synthesize: async (text): Promise<SynthesizedSpeech> => {
    const started = performance.now();
    const response = await fetch(deepgramSpeakUrl(apiModelId), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error(
        `Deepgram TTS ${apiModelId} failed: ${response.status} ${await response.text()}`,
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

export const createDeepgramSpeechToTextClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToTextClient => ({
  model: apiModelId,
  transcribe: async (audio: AudioClip): Promise<Transcription> => {
    const started = performance.now();
    const response = await fetch(deepgramListenUrl(apiModelId), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": audio.mimeType,
      },
      body: Buffer.from(audio.base64, "base64"),
    });
    if (!response.ok) {
      throw new Error(
        `Deepgram STT ${apiModelId} failed: ${response.status} ${await response.text()}`,
      );
    }
    const parsed = (await response.json()) as unknown;
    return {
      text: extractDeepgramTranscript(parsed),
      elapsedMs: performance.now() - started,
      model: apiModelId,
    };
  },
});
