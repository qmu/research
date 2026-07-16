import type {
  AudioClip,
  SpeechToTextClient,
  SynthesizedSpeech,
  TextToSpeechClient,
  Transcription,
} from "./types";

/**
 * OpenAI anti-corruption adapters for the speech topic: the audio speech
 * (text-to-speech) and audio transcriptions (speech-to-text) REST endpoints,
 * behind the provider-neutral ports. Only the OpenAI adapters are wired for the
 * real path in this first instrument; the remaining providers in the registry
 * are implemented alongside the owner-gated first real trial. Every call
 * measures its own wall-clock latency here so it is comparable across
 * providers.
 */

const OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_VOICE = "alloy";

const extensionForMime = (mimeType: string): string => {
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  return "mp3";
};

export const createOpenAiTextToSpeechClient = (
  apiModelId: string,
  apiKey: string,
  voice: string = DEFAULT_VOICE,
): TextToSpeechClient => ({
  model: apiModelId,
  synthesize: async (text): Promise<SynthesizedSpeech> => {
    const started = performance.now();
    const response = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: apiModelId,
        input: text,
        voice,
        response_format: "mp3",
      }),
    });
    if (!response.ok) {
      throw new Error(
        `OpenAI TTS ${apiModelId} failed: ${response.status} ${await response.text()}`,
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

export const createOpenAiSpeechToTextClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToTextClient => ({
  model: apiModelId,
  transcribe: async (audio: AudioClip): Promise<Transcription> => {
    const started = performance.now();
    const form = new FormData();
    const blob = new Blob([Buffer.from(audio.base64, "base64")], {
      type: audio.mimeType,
    });
    form.append("file", blob, `audio.${extensionForMime(audio.mimeType)}`);
    form.append("model", apiModelId);
    form.append("response_format", "json");
    const response = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) {
      throw new Error(
        `OpenAI STT ${apiModelId} failed: ${response.status} ${await response.text()}`,
      );
    }
    const parsed = (await response.json()) as { text?: unknown };
    return {
      text: typeof parsed.text === "string" ? parsed.text : "",
      elapsedMs: performance.now() - started,
      model: apiModelId,
    };
  },
});
