import type {
  AudioClip,
  SpeechToTextClient,
  SynthesizedSpeech,
  TextToSpeechClient,
  Transcription,
} from "./types";

/**
 * Keyless, deterministic speech clients for the fixture self-test. The bytes
 * flowing between them carry the source text verbatim, so the whole real
 * scoring path (synthesize → transcribe → word-accuracy) runs end to end
 * without a provider or an audio file, and its output is byte-stable across
 * runs — the same convention as the OCR/image fixtures echoing their reference.
 */

const FIXTURE_MIME = "audio/fixture";
const FIXTURE_PREFIX = "fixture-audio:";

/** Deterministic stand-in latency: stable per input, never a real clock. */
const fixtureLatencyMs = (text: string): number => 80 + text.length;

/** Encode text as the fixture "audio" bytes. */
export const encodeFixtureAudio = (text: string): AudioClip => ({
  base64: Buffer.from(`${FIXTURE_PREFIX}${text}`, "utf8").toString("base64"),
  mimeType: FIXTURE_MIME,
});

/** Recover the text a fixture clip encodes (empty string if it is not one). */
const decodeFixtureAudio = (audio: AudioClip): string => {
  const decoded = Buffer.from(audio.base64, "base64").toString("utf8");
  return decoded.startsWith(FIXTURE_PREFIX)
    ? decoded.slice(FIXTURE_PREFIX.length)
    : decoded;
};

export const createFixtureTextToSpeechClient = (
  model: string,
): TextToSpeechClient => ({
  model,
  synthesize: (text): Promise<SynthesizedSpeech> =>
    Promise.resolve({
      audio: encodeFixtureAudio(text),
      elapsedMs: fixtureLatencyMs(text),
      model,
    }),
});

export const createFixtureSpeechToTextClient = (
  model: string,
): SpeechToTextClient => ({
  model,
  transcribe: (audio): Promise<Transcription> => {
    const text = decodeFixtureAudio(audio);
    return Promise.resolve({ text, elapsedMs: fixtureLatencyMs(text), model });
  },
});
