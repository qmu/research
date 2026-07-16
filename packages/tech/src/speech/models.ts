import type {
  NonSubjectProvider,
  SpeechModelCard,
  StsCapability,
} from "./domain/types";

/**
 * Curated registry of the speech models this topic measures — the single source
 * of truth for subjects, catalog prices, and provenance. Every value is curated
 * catalog data with a cited source and a last-verified date, never a live
 * measurement.
 *
 * The registry deliberately anchors on models with a clean per-unit price:
 * text-to-speech billed per character and speech-to-text billed per minute.
 * Newer OpenAI/Google models (gpt-4o-mini-tts, gpt-4o-transcribe, the
 * speech-to-speech models) are token-billed and do not fit a single per-unit
 * price cleanly; the speech-to-speech ones are cataloged as a capability below,
 * and token-billed alternatives are left to a later instrument version.
 */
export const SPEECH_MODELS: ReadonlyArray<SpeechModelCard> = [
  // ---- Text-to-speech (price per 1M characters) ----
  {
    id: "openai-tts-1",
    provider: "openai",
    capability: "tts",
    modelName: "OpenAI TTS-1",
    apiModelId: "tts-1",
    price: 15,
    priceUnit: "USD/1M chars",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/models/tts-1",
  },
  {
    id: "elevenlabs-multilingual-v2",
    provider: "elevenlabs",
    capability: "tts",
    modelName: "ElevenLabs Multilingual v2",
    apiModelId: "eleven_multilingual_v2",
    price: 100,
    priceUnit: "USD/1M chars",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://elevenlabs.io/pricing/api",
  },
  {
    id: "google-neural2",
    provider: "google",
    capability: "tts",
    modelName: "Google Cloud Neural2",
    apiModelId: "Neural2",
    price: 16,
    priceUnit: "USD/1M chars",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://cloud.google.com/text-to-speech/pricing",
  },
  {
    id: "amazon-polly-neural",
    provider: "amazon",
    capability: "tts",
    modelName: "Amazon Polly Neural",
    apiModelId: "polly-neural",
    price: 16,
    priceUnit: "USD/1M chars",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://aws.amazon.com/polly/pricing/",
  },
  {
    id: "deepgram-aura-2",
    provider: "deepgram",
    capability: "tts",
    modelName: "Deepgram Aura-2",
    apiModelId: "aura-2",
    price: 30,
    priceUnit: "USD/1M chars",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://deepgram.com/pricing",
  },
  // ---- Speech-to-text (price per audio minute) ----
  {
    id: "openai-whisper-1",
    provider: "openai",
    capability: "stt",
    modelName: "OpenAI Whisper",
    apiModelId: "whisper-1",
    price: 0.006,
    priceUnit: "USD/audio-minute",
    streaming: false,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "deepgram-nova-3",
    provider: "deepgram",
    capability: "stt",
    modelName: "Deepgram Nova-3",
    apiModelId: "nova-3",
    price: 0.0077,
    priceUnit: "USD/audio-minute",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://deepgram.com/pricing",
  },
  {
    id: "assemblyai-universal",
    provider: "assemblyai",
    capability: "stt",
    modelName: "AssemblyAI Universal",
    apiModelId: "universal",
    price: 0.0035,
    priceUnit: "USD/audio-minute",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://www.assemblyai.com/pricing",
  },
  {
    id: "google-chirp",
    provider: "google",
    capability: "stt",
    modelName: "Google Cloud Speech-to-Text (Chirp)",
    apiModelId: "chirp",
    price: 0.016,
    priceUnit: "USD/audio-minute",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://cloud.google.com/speech-to-text/pricing",
  },
  {
    id: "amazon-transcribe",
    provider: "amazon",
    capability: "stt",
    modelName: "Amazon Transcribe",
    apiModelId: "amazon-transcribe",
    price: 0.006,
    priceUnit: "USD/audio-minute",
    streaming: true,
    lastVerified: "2026-07-14",
    source: "https://aws.amazon.com/transcribe/pricing/",
  },
];

/**
 * Realtime speech-to-speech (duplex) APIs, cataloged as a capability. v1 records
 * existence with a cited source; round-trip latency is measured by a later
 * ticket. Prices vary (all token-billed) and are not carried here.
 */
export const STS_CAPABILITIES: ReadonlyArray<StsCapability> = [
  {
    provider: "OpenAI",
    apiName: "Realtime API (GPT Realtime, GA)",
    apiModelId: "gpt-realtime",
    duplexRealtime: true,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/models/gpt-realtime",
  },
  {
    provider: "Google",
    apiName: "Gemini Live API (2.5 Flash Native Audio)",
    apiModelId: "gemini-2.5-flash-native-audio-preview-12-2025",
    duplexRealtime: true,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/live",
  },
  {
    provider: "AWS",
    apiName: "Bedrock Nova Sonic (legacy; Nova 2 Sonic successor)",
    apiModelId: "amazon.nova-sonic-v1:0",
    duplexRealtime: true,
    lastVerified: "2026-07-14",
    source:
      "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-sonic.html",
  },
  {
    provider: "xAI",
    apiName: "Grok Voice Agent API",
    apiModelId: "grok-voice-latest",
    duplexRealtime: true,
    lastVerified: "2026-07-14",
    source: "https://docs.x.ai/developers/model-capabilities/audio/voice-agent",
  },
];

/**
 * Providers in this repository's stack that expose NO speech API, recorded
 * explicitly so the report shows an honest not-applicable row. (xAI is NOT here:
 * it exposes a Grok Voice speech-to-speech API plus STT/TTS endpoints as of the
 * verification date, so it is a speech-to-speech subject above.)
 */
export const NON_SUBJECT_PROVIDERS: ReadonlyArray<NonSubjectProvider> = [
  {
    providerName: "Anthropic",
    reason:
      "exposes no speech API (Claude accepts only text/image input and returns text)",
    lastVerified: "2026-07-14",
  },
];

/**
 * The fixed speech-to-text judge that reads every text-to-speech output, so
 * intelligibility scores stay comparable across TTS subjects. Whisper is truly
 * per-minute priced, so the judge cost is simple to estimate. Changing the
 * judge is an instrument-version bump, not a silent swap.
 */
export const TTS_JUDGE_MODEL_ID = "whisper-1";

/** Whisper's catalog per-minute price, used to size the TTS judge cost in the
 * estimate (see `TTS_JUDGE_MODEL_ID`). */
export const JUDGE_STT_USD_PER_MINUTE = 0.006;
