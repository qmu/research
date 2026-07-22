/**
 * The provider-neutral speech ports the speech topic's domain depends on. Named
 * in domain vocabulary (synthesize / transcribe), never in any vendor SDK's
 * terms — the anti-corruption boundary for text-to-speech and speech-to-text.
 * Each adapter measures its own wall-clock `elapsedMs` inside the call so timing
 * is comparable across providers regardless of transport.
 */

/** A block of audio flowing between the topic and a provider. On the keyless
 * fixture path the bytes deterministically encode the source text (see
 * `vendors/speech/fixture.ts`); on a real run they are provider audio or a
 * locally supplied clip. */
export type AudioClip = Readonly<{
  /** Base64-encoded audio bytes. */
  base64: string;
  /** IANA media type, e.g. `audio/mpeg`, `audio/wav`, or `audio/fixture`. */
  mimeType: string;
}>;

export type SynthesizedSpeech = Readonly<{
  audio: AudioClip;
  /** Wall-clock synthesis latency measured inside the adapter. */
  elapsedMs: number;
  model: string;
}>;

export type Transcription = Readonly<{
  text: string;
  /** Wall-clock transcription latency measured inside the adapter. */
  elapsedMs: number;
  model: string;
}>;

/** Text-to-speech: turn text into audio. */
export type TextToSpeechClient = Readonly<{
  model: string;
  synthesize: (text: string) => Promise<SynthesizedSpeech>;
}>;

/** Speech-to-text: turn audio into text. Doubles as the fixed intelligibility
 * judge that reads TTS output (mirroring the image topic's vision judge). */
export type SpeechToTextClient = Readonly<{
  model: string;
  transcribe: (audio: AudioClip) => Promise<Transcription>;
}>;

/** The result of one speech-to-speech (realtime duplex) round-trip: the
 * wall-clock latency from committing a short input turn to the first
 * audio-output chunk. A single, well-defined round-trip — never a whole
 * conversation — so the number is comparable across realtime providers. */
export type SpeechToSpeechRoundTrip = Readonly<{
  /** Wall-clock ms from committing the input turn to the first audio-out chunk. */
  firstAudioLatencyMs: number;
  /** Byte length of that first audio-output chunk (diagnostic, not scored). */
  firstAudioByteLength: number;
  model: string;
}>;

/** Speech-to-speech: a realtime duplex session. `roundTrip` sends one short
 * input turn and resolves when the first audio-output chunk arrives. The input
 * turn is text (a control simplification so the round-trip is reproducible
 * without committing an audio clip); the measured number is the first
 * audio-out latency after the input is committed. */
export type SpeechToSpeechClient = Readonly<{
  model: string;
  roundTrip: (prompt: string) => Promise<SpeechToSpeechRoundTrip>;
}>;
