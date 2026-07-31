import type {
  AudioClip,
  SpeechToTextClient,
  SynthesizedSpeech,
  TextToSpeechClient,
  Transcription,
} from "./types";

/**
 * Google Cloud anti-corruption adapters for the speech topic: the
 * Text-to-Speech `text:synthesize` and Speech-to-Text `speech:recognize` v1 REST
 * endpoints, authenticated with an API key (`?key=`) so the call stays a
 * single-shot, in-memory, resource-free request — no service-account OAuth, no
 * bucket. Both carry base64 audio in the JSON body/response. Google-specific
 * facts (endpoints, the API-key query param, the concrete voice name, the
 * results shape, WAV header auto-detection) stay inside this ACL.
 *
 * Caveat recorded for the first real trial: Google's newest Chirp STT models are
 * served by the v2 regional API (`{region}-speech.googleapis.com`) which needs
 * OAuth + a project/recognizer rather than an API key. This adapter targets the
 * API-key-compatible v1 `recognize` surface and passes the registry model id
 * through as `config.model`; if the owner selects a v2-only Chirp variant, Google
 * STT joins the AWS SigV4 follow-up (a credential-contract decision), same class
 * as Amazon Transcribe.
 */

const TTS_BASE = "https://texttospeech.googleapis.com/v1";
const STT_BASE = "https://speech.googleapis.com/v1";

const LANGUAGE_CODE = "en-US";

/** The concrete Neural2 voice the registry's `Neural2` card synthesizes with.
 * Fixed for reproducibility; the topic scores intelligibility, not a voice. */
export const DEFAULT_NEURAL2_VOICE = "en-US-Neural2-C";

/** Map a registry TTS `apiModelId` to a concrete Google voice name. */
export const googleVoiceName = (apiModelId: string): string =>
  apiModelId === "Neural2" ? DEFAULT_NEURAL2_VOICE : apiModelId;

export const googleSynthesisUrl = (apiKey: string): string =>
  `${TTS_BASE}/text:synthesize?key=${apiKey}`;

export const googleRecognizeUrl = (apiKey: string): string =>
  `${STT_BASE}/speech:recognize?key=${apiKey}`;

/** Pure synthesis request body. Exported for keyless unit testing. */
export const googleSynthesisBody = (apiModelId: string, text: string): string =>
  JSON.stringify({
    input: { text },
    voice: { languageCode: LANGUAGE_CODE, name: googleVoiceName(apiModelId) },
    audioConfig: { audioEncoding: "MP3" },
  });

/**
 * Pure recognize request body. For WAV audio the encoding and sample rate are
 * omitted so Google reads them from the RIFF header (its documented behavior),
 * which avoids guessing a sample rate; the registry model id passes through as
 * `config.model`. Exported for keyless unit testing.
 */
export const googleRecognizeBody = (
  apiModelId: string,
  audio: AudioClip,
): string => {
  const isWav = audio.mimeType.includes("wav");
  const config: Record<string, unknown> = {
    languageCode: LANGUAGE_CODE,
    model: apiModelId,
  };
  if (!isWav && audio.mimeType.includes("flac")) config.encoding = "FLAC";
  return JSON.stringify({ config, audio: { content: audio.base64 } });
};

/** Pure extractor for the synthesize response `{ audioContent: <base64> }`.
 * Total over missing/malformed fields (returns ""). */
export const extractGoogleAudioContent = (raw: unknown): string => {
  if (raw === null || typeof raw !== "object") return "";
  const content = (raw as { audioContent?: unknown }).audioContent;
  return typeof content === "string" ? content : "";
};

/**
 * Pure extractor for the recognize response: join the first alternative of each
 * result. Total over missing/malformed fields (returns ""). Exported so it is
 * unit-tested against recorded shapes without a network call.
 */
export const extractGoogleTranscript = (raw: unknown): string => {
  if (raw === null || typeof raw !== "object") return "";
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(results)) return "";
  const parts: string[] = [];
  for (const result of results) {
    if (result === null || typeof result !== "object") continue;
    const alternatives = (result as { alternatives?: unknown }).alternatives;
    if (!Array.isArray(alternatives) || alternatives.length === 0) continue;
    const transcript = (alternatives[0] as { transcript?: unknown }).transcript;
    if (typeof transcript === "string" && transcript.length > 0) {
      parts.push(transcript.trim());
    }
  }
  return parts.join(" ");
};

export const createGoogleTextToSpeechClient = (
  apiModelId: string,
  apiKey: string,
): TextToSpeechClient => ({
  model: apiModelId,
  synthesize: async (text): Promise<SynthesizedSpeech> => {
    const started = performance.now();
    const response = await fetch(googleSynthesisUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: googleSynthesisBody(apiModelId, text),
    });
    if (!response.ok) {
      throw new Error(
        `Google TTS ${apiModelId} failed: ${response.status} ${await response.text()}`,
      );
    }
    const base64 = extractGoogleAudioContent(await response.json());
    return {
      audio: { base64, mimeType: "audio/mpeg" },
      elapsedMs: performance.now() - started,
      model: apiModelId,
    };
  },
});

export const createGoogleSpeechToTextClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToTextClient => ({
  model: apiModelId,
  transcribe: async (audio: AudioClip): Promise<Transcription> => {
    const started = performance.now();
    const response = await fetch(googleRecognizeUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: googleRecognizeBody(apiModelId, audio),
    });
    if (!response.ok) {
      throw new Error(
        `Google STT ${apiModelId} failed: ${response.status} ${await response.text()}`,
      );
    }
    return {
      text: extractGoogleTranscript(await response.json()),
      elapsedMs: performance.now() - started,
      model: apiModelId,
    };
  },
});
