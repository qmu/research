import type {
  AudioClip,
  SpeechToTextClient,
  TextToSpeechClient,
} from "../vendors/speech/types";
import {
  createFixtureSpeechToTextClient,
  createFixtureTextToSpeechClient,
  encodeFixtureAudio,
} from "../vendors/speech/fixture";
import {
  createOpenAiSpeechToTextClient,
  createOpenAiTextToSpeechClient,
} from "../vendors/speech/openai";
import { SPEECH_MANIFEST } from "./domain/manifest";
import { summarizeStat, wordAccuracy, wordErrorRate } from "./domain/score";
import type {
  Provenance,
  SpeechCallRecord,
  SpeechComparisonResult,
  SpeechModelCard,
  SpeechModelRun,
  SttUtterance,
} from "./domain/types";
import {
  JUDGE_STT_USD_PER_MINUTE,
  NON_SUBJECT_PROVIDERS,
  SPEECH_MODELS,
  STS_CAPABILITIES,
  TTS_JUDGE_MODEL_ID,
} from "./models";

export type SpeechRunOptions = Readonly<{
  fixture: boolean;
  trials: number;
  modelIds?: ReadonlyArray<string>;
  /**
   * Supplies reference audio for an STT utterance on the real path (the
   * entrypoint reads `SPEECH_AUDIO_DIR`). Unused on the keyless fixture path,
   * where the reference transcript is encoded into the audio bytes directly.
   */
  loadReferenceAudio?: (utterance: SttUtterance) => Promise<AudioClip>;
}>;

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

// Estimate premises. Synthesized speech runs ~14 characters/second; a
// transcription bills per audio minute. Reference clips average ~10 words at
// ~150 words/minute. These size the cost preview; the artifact records the real
// timing once an owner runs the real path.
const SYNTHESIS_CHARS_PER_SECOND = 14;
const STT_WORDS_PER_MINUTE = 150;

const OPENAI_KEY_ENV = "OPENAI_API_KEY";

const ttsClientFor = (
  card: SpeechModelCard,
  fixture: boolean,
): TextToSpeechClient => {
  if (fixture) return createFixtureTextToSpeechClient(card.apiModelId);
  if (card.provider === "openai") {
    const key = process.env[OPENAI_KEY_ENV];
    if (key === undefined || key === "") {
      throw new Error(`${OPENAI_KEY_ENV} is required for a real OpenAI run.`);
    }
    return createOpenAiTextToSpeechClient(card.apiModelId, key);
  }
  throw new Error(
    `real TTS adapter for provider '${card.provider}' is not wired yet ` +
      `(the first-trial ticket implements it); run --fixture or select OpenAI.`,
  );
};

const sttClientFor = (
  card: SpeechModelCard,
  fixture: boolean,
): SpeechToTextClient => {
  if (fixture) return createFixtureSpeechToTextClient(card.apiModelId);
  if (card.provider === "openai") {
    const key = process.env[OPENAI_KEY_ENV];
    if (key === undefined || key === "") {
      throw new Error(`${OPENAI_KEY_ENV} is required for a real OpenAI run.`);
    }
    return createOpenAiSpeechToTextClient(card.apiModelId, key);
  }
  throw new Error(
    `real STT adapter for provider '${card.provider}' is not wired yet ` +
      `(the first-trial ticket implements it); run --fixture or select OpenAI.`,
  );
};

/** The fixed STT judge that reads every TTS output, so intelligibility scores
 * stay comparable across TTS subjects. Fixture path echoes the source text. */
const ttsJudgeFor = (fixture: boolean): SpeechToTextClient => {
  if (fixture) return createFixtureSpeechToTextClient("fixture-judge");
  const key = process.env[OPENAI_KEY_ENV];
  if (key === undefined || key === "") {
    throw new Error(`${OPENAI_KEY_ENV} is required for the real STT judge.`);
  }
  return createOpenAiSpeechToTextClient(TTS_JUDGE_MODEL_ID, key);
};

const byteLengthOfBase64 = (base64: string): number =>
  Math.floor((base64.replace(/=+$/, "").length * 3) / 4);

const runTtsOnce = async (
  client: TextToSpeechClient,
  judge: SpeechToTextClient,
  utterance: { id: string; text: string },
  repetition: number,
): Promise<SpeechCallRecord> => {
  const synthesized = await client.synthesize(utterance.text);
  const judged = await judge.transcribe(synthesized.audio);
  return {
    utteranceId: utterance.id,
    repetition,
    latencyMs: synthesized.elapsedMs,
    audioByteLength: byteLengthOfBase64(synthesized.audio.base64),
    audioMimeType: synthesized.audio.mimeType,
    judgeTranscription: judged.text,
    intelligibility: wordAccuracy(utterance.text, judged.text),
  };
};

const runSttOnce = async (
  client: SpeechToTextClient,
  utterance: SttUtterance,
  audio: AudioClip,
  repetition: number,
): Promise<SpeechCallRecord> => {
  const transcription = await client.transcribe(audio);
  return {
    utteranceId: utterance.id,
    repetition,
    latencyMs: transcription.elapsedMs,
    hypothesis: transcription.text,
    wordErrorRate: wordErrorRate(
      utterance.referenceTranscript,
      transcription.text,
    ),
    wordAccuracy: wordAccuracy(
      utterance.referenceTranscript,
      transcription.text,
    ),
  };
};

const aggregate = (
  card: SpeechModelCard,
  provenance: Provenance,
  measuredAt: string,
  trials: number,
  calls: ReadonlyArray<SpeechCallRecord>,
  error?: string,
): SpeechModelRun => ({
  id: card.id,
  provider: card.provider,
  capability: card.capability,
  modelName: card.modelName,
  apiModelId: card.apiModelId,
  price: card.price,
  priceUnit: card.priceUnit,
  streaming: card.streaming,
  source: card.source,
  provenance,
  measuredAt,
  trialsRequested: trials,
  stats: {
    latencyMs: summarizeStat(calls.map((call) => call.latencyMs)),
    intelligibility: summarizeStat(
      calls
        .map((call) => call.intelligibility)
        .filter((value): value is number => value !== undefined),
    ),
    wordAccuracy: summarizeStat(
      calls
        .map((call) => call.wordAccuracy)
        .filter((value): value is number => value !== undefined),
    ),
  },
  calls,
  ...(error === undefined ? {} : { error }),
});

const selectedCards = (
  modelIds: ReadonlyArray<string> | undefined,
): ReadonlyArray<SpeechModelCard> =>
  modelIds === undefined || modelIds.length === 0
    ? SPEECH_MODELS
    : SPEECH_MODELS.filter((card) => modelIds.includes(card.id));

const loadRealAudio = (
  options: SpeechRunOptions,
  utterance: SttUtterance,
): Promise<AudioClip> => {
  if (options.loadReferenceAudio === undefined) {
    throw new Error(
      `a real STT run needs reference audio; set SPEECH_AUDIO_DIR so the ` +
        `entrypoint can supply a clip for '${utterance.id}'.`,
    );
  }
  return options.loadReferenceAudio(utterance);
};

const runOneCard = async (
  card: SpeechModelCard,
  options: SpeechRunOptions,
  judge: SpeechToTextClient,
  trials: number,
): Promise<ReadonlyArray<SpeechCallRecord>> => {
  const calls: SpeechCallRecord[] = [];
  if (card.capability === "tts") {
    const client = ttsClientFor(card, options.fixture);
    for (let repetition = 0; repetition < trials; repetition += 1) {
      for (const utterance of SPEECH_MANIFEST.tts) {
        calls.push(await runTtsOnce(client, judge, utterance, repetition));
      }
    }
    return calls;
  }
  const client = sttClientFor(card, options.fixture);
  for (let repetition = 0; repetition < trials; repetition += 1) {
    for (const utterance of SPEECH_MANIFEST.stt) {
      const audio = options.fixture
        ? encodeFixtureAudio(utterance.referenceTranscript)
        : await loadRealAudio(options, utterance);
      calls.push(await runSttOnce(client, utterance, audio, repetition));
    }
  }
  return calls;
};

export const runSpeechComparison = async (
  options: SpeechRunOptions,
): Promise<SpeechComparisonResult> => {
  const trials = Math.max(1, Math.trunc(options.trials));
  const generatedAt = options.fixture
    ? FIXTURE_TIMESTAMP
    : new Date().toISOString();
  const judge = ttsJudgeFor(options.fixture);
  const runs: SpeechModelRun[] = [];
  for (const card of selectedCards(options.modelIds)) {
    try {
      const calls = await runOneCard(card, options, judge, trials);
      runs.push(
        aggregate(
          card,
          options.fixture ? "fixtured" : "measured",
          generatedAt,
          trials,
          calls,
        ),
      );
    } catch (error) {
      runs.push(
        aggregate(card, "error", generatedAt, trials, [], String(error)),
      );
    }
  }
  return {
    generatedAt,
    fixture: options.fixture,
    trials,
    judgeModel: options.fixture ? "fixture-judge" : TTS_JUDGE_MODEL_ID,
    manifestVersion: SPEECH_MANIFEST.version,
    runs,
    stsCapabilities: STS_CAPABILITIES,
    nonSubjects: NON_SUBJECT_PROVIDERS,
    artifactPath: "speech-comparison.data.json",
  };
};

/** Rough cost preview for a real run. TTS bills per character plus one STT
 * judge read of the synthesized audio; STT bills per audio minute. */
export const estimateSpeech = (
  modelIds: ReadonlyArray<string> | undefined,
  trials: number,
): string => {
  const trialCount = Math.max(1, Math.trunc(trials));
  const ttsChars = SPEECH_MANIFEST.tts.reduce(
    (sum, utterance) => sum + utterance.text.length,
    0,
  );
  const ttsAudioMinutes = ttsChars / SYNTHESIS_CHARS_PER_SECOND / 60;
  const sttMinutes = SPEECH_MANIFEST.stt.reduce((sum, utterance) => {
    const words = utterance.referenceTranscript.trim().split(/\s+/).length;
    return sum + words / STT_WORDS_PER_MINUTE;
  }, 0);

  const lines = selectedCards(modelIds).map((card) => {
    if (card.capability === "tts") {
      const synthesis = (ttsChars / 1_000_000) * card.price * trialCount;
      const judge = ttsAudioMinutes * JUDGE_STT_USD_PER_MINUTE * trialCount;
      return `  ${card.id}: ~$${(synthesis + judge).toFixed(4)} (${SPEECH_MANIFEST.tts.length} utterance(s) × ${trialCount}, synthesis + STT judge)`;
    }
    const cost = sttMinutes * card.price * trialCount;
    return `  ${card.id}: ~$${cost.toFixed(4)} (${SPEECH_MANIFEST.stt.length} clip(s) × ${trialCount})`;
  });
  const total = selectedCards(modelIds).reduce((sum, card) => {
    if (card.capability === "tts") {
      return (
        sum +
        ((ttsChars / 1_000_000) * card.price +
          ttsAudioMinutes * JUDGE_STT_USD_PER_MINUTE) *
          trialCount
      );
    }
    return sum + sttMinutes * card.price * trialCount;
  }, 0);
  return [
    "speech estimate (real run; audio-duration figures are approximations):",
    ...lines,
    `  total: ~$${total.toFixed(2)} (agreed ceiling: $10/trial — stop for re-approval above it)`,
    "No persistent provider resources are created; audio is scored in memory and discarded.",
  ].join("\n");
};
