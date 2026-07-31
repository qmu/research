/**
 * Pure domain types for the speech (TTS / STT / STS) comparison. Every score is
 * a mechanically computed word-accuracy ratio — no naturalness (MOS) or other
 * subjective listening judgement enters here, mirroring how the image topic
 * scores only rubric-checkable adherence, never aesthetics.
 */

export type SpeechProvider =
  | "openai"
  | "elevenlabs"
  | "google"
  | "amazon"
  | "cartesia"
  | "deepgram"
  | "assemblyai";

/** The two mechanically scored capabilities. Speech-to-speech (STS) is carried
 * as a cataloged capability (see `StsCapability`), not a scored subject, in v1. */
export type SpeechCapability = "tts" | "stt";

/** Price unit for a subject: text-to-speech bills per character, speech-to-text
 * per minute of audio. Kept explicit so cost arithmetic stays honest. */
export type PriceUnit = "USD/1M chars" | "USD/audio-minute";

export type SpeechModelCard = Readonly<{
  /** Registry id (CLI selector and artifact key). */
  id: string;
  provider: SpeechProvider;
  capability: SpeechCapability;
  modelName: string;
  apiModelId: string;
  /** Curated catalog price in `priceUnit` (reference data, not measured). */
  price: number;
  priceUnit: PriceUnit;
  /** Whether the provider offers a streaming (chunked) form of this call. */
  streaming: boolean;
  /** Date the id and price were last checked against `source`. */
  lastVerified: string;
  source: string;
}>;

/** A provider's realtime speech-to-speech (duplex) API, cataloged as a
 * capability with a cited source. Round-trip latency is measured separately (see
 * `StsRoundTripRun`); this record is the catalog, always present. */
export type StsCapability = Readonly<{
  provider: string;
  apiName: string;
  apiModelId: string;
  duplexRealtime: boolean;
  lastVerified: string;
  source: string;
  /** The env var whose presence lets the round-trip be measured on a real run.
   * Absent for providers with no wired realtime adapter (AWS, xAI), so those
   * stay honest `error` rows without a spend attempt. */
  realtimeKeyEnv?: string;
}>;

/** One speech-to-speech round-trip: the first-audio latency after a short input
 * turn is committed (see `SpeechToSpeechClient`). */
export type StsRoundTripCall = Readonly<{
  turnId: string;
  repetition: number;
  firstAudioLatencyMs: number;
  /** Byte length of the first audio-output chunk (diagnostic, not scored). */
  firstAudioByteLength: number;
}>;

/** A measured (or attempted) speech-to-speech subject: an `StsCapability` plus
 * the round-trip latency stat, with honest per-row provenance exactly like the
 * TTS/STT subject rows. */
export type StsRoundTripRun = Readonly<{
  provider: string;
  apiName: string;
  apiModelId: string;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{ roundTripLatencyMs: Stat }>;
  calls: ReadonlyArray<StsRoundTripCall>;
  error?: string;
}>;

/** A provider in this repo's stack that exposes no speech API, recorded so the
 * report shows an honest not-applicable note instead of a silent omission. */
export type NonSubjectProvider = Readonly<{
  providerName: string;
  reason: string;
  lastVerified: string;
}>;

/** One text the TTS subjects synthesize; the STT judge reads the result and
 * intelligibility is the word-accuracy of its transcription against `text`. */
export type TtsUtterance = Readonly<{
  id: string;
  text: string;
}>;

/** One reference transcript the STT subjects are scored against. On a real run
 * the audio is supplied locally (see `audioSource`); on the fixture path the
 * reference is echoed through the keyless clients. */
export type SttUtterance = Readonly<{
  id: string;
  referenceTranscript: string;
  /** Citation for the reference audio a real run reads from `SPEECH_AUDIO_DIR`. */
  audioSource: string;
}>;

/** One short input turn a speech-to-speech round-trip commits; the metric is the
 * latency to the first audio-output chunk, not the turn's content. */
export type StsTurn = Readonly<{
  id: string;
  prompt: string;
}>;

export type SpeechManifest = Readonly<{
  version: string;
  tts: ReadonlyArray<TtsUtterance>;
  stt: ReadonlyArray<SttUtterance>;
  /** Realtime round-trip turns. Added without a version bump: they introduce a
   * new independent series (STS latency) and leave the TTS/STT inputs byte-for-
   * byte unchanged, so same-version history for those series stays valid. */
  sts: ReadonlyArray<StsTurn>;
}>;

export type Stat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

export type Provenance = "measured" | "fixtured" | "error";

/** One synthesis or transcription, recorded in full — minus the audio binary
 * (the artifact keeps byte length, timing, transcription, and scores, never the
 * audio itself). */
export type SpeechCallRecord = Readonly<{
  utteranceId: string;
  repetition: number;
  latencyMs: number;
  /** TTS: byte length of the synthesized audio. */
  audioByteLength?: number;
  audioMimeType?: string;
  /** TTS: the STT judge's transcription of the synthesized audio. */
  judgeTranscription?: string;
  /** TTS: word-accuracy of the judge transcription vs the source text. */
  intelligibility?: number;
  /** STT: the subject's transcription of the reference audio. */
  hypothesis?: string;
  /** STT: word error rate vs the reference transcript. */
  wordErrorRate?: number;
  /** STT: 1 − WER, floored at 0. */
  wordAccuracy?: number;
}>;

export type SpeechModelRun = Readonly<{
  id: string;
  provider: SpeechProvider;
  capability: SpeechCapability;
  modelName: string;
  apiModelId: string;
  price: number;
  priceUnit: PriceUnit;
  streaming: boolean;
  source: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    latencyMs: Stat;
    /** TTS intelligibility (word-accuracy of the judge transcription). */
    intelligibility: Stat;
    /** STT word-accuracy (1 − WER). */
    wordAccuracy: Stat;
  }>;
  calls: ReadonlyArray<SpeechCallRecord>;
  error?: string;
}>;

export type SpeechComparisonResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  /** The fixed STT judge that reads every TTS output. */
  judgeModel: string;
  manifestVersion: string;
  runs: ReadonlyArray<SpeechModelRun>;
  stsCapabilities: ReadonlyArray<StsCapability>;
  /** Measured (or attempted) speech-to-speech round-trip latency, one per
   * cataloged realtime provider. Aligns 1:1 with `stsCapabilities` by provider. */
  stsRuns: ReadonlyArray<StsRoundTripRun>;
  nonSubjects: ReadonlyArray<NonSubjectProvider>;
  artifactPath: string;
}>;
