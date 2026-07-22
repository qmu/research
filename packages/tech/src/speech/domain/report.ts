import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { SPEECH_MANIFEST } from "./manifest";
import type {
  SpeechCapability,
  SpeechComparisonResult,
  SpeechModelRun,
  Stat,
  StsRoundTripRun,
} from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;
const ms = (value: number): string => `${value.toFixed(0)} ms`;

const statCell = (stat: Stat, format: (value: number) => string): string =>
  stat.n === 0
    ? "not measured"
    : `${format(stat.mean)} ± ${format(stat.stdDev)} (n=${stat.n})`;

const priceCell = (run: SpeechModelRun): string =>
  `${run.price} ${run.priceUnit}`;

const medianOf = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (upper === undefined) return 0;
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
};

type Aspect = Readonly<{
  title: string;
  better: "higher" | "lower";
  value: (run: SpeechModelRun) => number;
  format: (value: number) => string;
}>;

const ttsAspects: ReadonlyArray<Aspect> = [
  {
    title: "Synthesis latency",
    better: "lower",
    value: (run) => run.stats.latencyMs.mean,
    format: ms,
  },
  {
    title: "Intelligibility",
    better: "higher",
    value: (run) => run.stats.intelligibility.mean,
    format: pct,
  },
];

const sttAspects: ReadonlyArray<Aspect> = [
  {
    title: "Transcription latency",
    better: "lower",
    value: (run) => run.stats.latencyMs.mean,
    format: ms,
  },
  {
    title: "Word accuracy",
    better: "higher",
    value: (run) => run.stats.wordAccuracy.mean,
    format: pct,
  },
];

const aspectRows = (
  measured: ReadonlyArray<SpeechModelRun>,
  aspects: ReadonlyArray<Aspect>,
): string =>
  aspects
    .map((aspect) => {
      const sorted = [...measured].sort((a, b) =>
        aspect.better === "higher"
          ? aspect.value(b) - aspect.value(a)
          : aspect.value(a) - aspect.value(b),
      );
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      if (best === undefined || worst === undefined) {
        return `| ${aspect.title} | n/a | n/a | n/a |`;
      }
      return (
        `| ${aspect.title} | ${aspect.format(aspect.value(best))} — ${escapeCell(best.modelName)} | ` +
        `${aspect.format(medianOf(measured.map(aspect.value)))} | ${aspect.format(aspect.value(worst))} |`
      );
    })
    .join("\n");

const capabilityOverview = (
  result: SpeechComparisonResult,
  capability: SpeechCapability,
  aspects: ReadonlyArray<Aspect>,
  label: string,
): string => {
  const measured = result.runs.filter(
    (run) => run.capability === capability && run.provenance === "measured",
  );
  if (measured.length === 0) {
    return `**${label}** — no measured rows this run; the committed fixture page proves the harness. See section 7.`;
  }
  return `**${label}**

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
${aspectRows(measured, aspects)}`;
};

/** The compact §4 line for speech-to-speech: measured round-trip latency
 * best/worst when any provider was measured, else the cataloged-capability
 * count with an honest "not measured this run" note. */
const stsOverviewLine = (result: SpeechComparisonResult): string => {
  const cataloged = result.stsCapabilities.filter(
    (entry) => entry.duplexRealtime,
  ).length;
  const measured = result.stsRuns.filter(
    (run) =>
      run.provenance === "measured" && run.stats.roundTripLatencyMs.n > 0,
  );
  if (measured.length === 0) {
    return `**Speech-to-speech** — ${cataloged} of ${result.stsCapabilities.length} cataloged providers expose a realtime duplex API; no round-trip latency measured this run (unreachable providers are honest \`error\` rows). The full capability table is in section 7.`;
  }
  const sorted = [...measured].sort(
    (a, b) => a.stats.roundTripLatencyMs.mean - b.stats.roundTripLatencyMs.mean,
  );
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  const fastestCell =
    fastest === undefined
      ? "n/a"
      : `${ms(fastest.stats.roundTripLatencyMs.mean)} — ${escapeCell(fastest.provider)}`;
  const slowestCell =
    slowest === undefined
      ? "n/a"
      : `${ms(slowest.stats.roundTripLatencyMs.mean)} — ${escapeCell(slowest.provider)}`;
  return `**Speech-to-speech** — round-trip first-audio latency measured for ${measured.length} of ${cataloged} realtime providers: fastest ${fastestCell}; slowest ${slowestCell}. Per-provider rows and unreachable providers are in section 7.`;
};

/**
 * The §4 overview: two compact best/median/worst tables (TTS, STT) plus a
 * one-line STS summary. Exhaustive per-subject rows live in §7 by the
 * site-wide article policy, keeping §4 within its budget.
 */
const overviewSection = (result: SpeechComparisonResult): string => {
  const measured = result.runs.filter((run) => run.provenance === "measured");
  const counts = `This run has **${measured.length} measured** of ${result.runs.length} subject rows (non-measured rows are \`fixtured\` harness checks or \`error\` rows, never faked numbers).`;
  return `${counts}

${capabilityOverview(result, "tts", ttsAspects, "Text-to-speech")}

${capabilityOverview(result, "stt", sttAspects, "Speech-to-text")}

${stsOverviewLine(result)} "Best"/"Worst" follow each metric's direction (lower latency, higher intelligibility and word accuracy are better).`;
};

const modelTable = (result: SpeechComparisonResult): string => {
  const header =
    "| Subject | Provider | Capability | Provenance | Price | Streaming | Latency (mean±sd) | Intelligibility | Word accuracy | Note |\n" +
    "| ------- | -------- | ---------- | ---------- | ----- | --------- | ----------------- | --------------- | ------------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.modelName)} | ${run.provider} | ${run.capability} | ${run.provenance} | ` +
      `${escapeCell(priceCell(run))} | ${run.streaming ? "yes" : "no"} | ` +
      `${statCell(run.stats.latencyMs, (v) => v.toFixed(0))} | ` +
      `${statCell(run.stats.intelligibility, pct)} | ` +
      `${statCell(run.stats.wordAccuracy, pct)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const stsLatencyCell = (run: StsRoundTripRun | undefined): string => {
  if (run === undefined) return "not attempted";
  if (run.provenance === "error") return "error";
  return statCell(run.stats.roundTripLatencyMs, (v) => v.toFixed(0));
};

const stsTable = (result: SpeechComparisonResult): string => {
  const runByProvider = new Map(
    result.stsRuns.map((run) => [run.provider, run]),
  );
  const header =
    "| Provider | API | Model id | Duplex realtime | Provenance | Round-trip first-audio (mean±sd) | Verified | Source / note |\n" +
    "| -------- | --- | -------- | --------------- | ---------- | -------------------------------- | -------- | ------------- |";
  const rows = result.stsCapabilities.map((entry) => {
    const run = runByProvider.get(entry.provider);
    const provenance = run?.provenance ?? "not attempted";
    const note = run?.error ?? entry.source;
    return (
      `| ${escapeCell(entry.provider)} | ${escapeCell(entry.apiName)} | ${escapeCell(entry.apiModelId)} | ${entry.duplexRealtime ? "yes" : "no"} | ` +
      `${provenance} | ${stsLatencyCell(run)} | ${entry.lastVerified} | ${escapeCell(note)} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

const manifestTable = (): string => {
  const header =
    "| Utterance id | Kind | Text / reference |\n| ------------ | ---- | ---------------- |";
  const tts = SPEECH_MANIFEST.tts.map(
    (utterance) => `| ${utterance.id} | tts | ${escapeCell(utterance.text)} |`,
  );
  const stt = SPEECH_MANIFEST.stt.map(
    (utterance) =>
      `| ${utterance.id} | stt | ${escapeCell(utterance.referenceTranscript)} |`,
  );
  return `${header}\n${[...tts, ...stt].join("\n")}`;
};

const nonSubjectLines = (result: SpeechComparisonResult): string =>
  result.nonSubjects
    .map(
      (entry) =>
        `- **${escapeCell(entry.providerName)}** is not a subject: it ${entry.reason} (verified ${entry.lastVerified}).`,
    )
    .join("\n");

export const renderSpeechReport = (result: SpeechComparisonResult): string =>
  renderEnglishResearchArticle({
    // Sidebar-page title: must equal the topic's sidebar label when published.
    title: "Speech (TTS / STT / STS)",
    description:
      "A reproducible comparison of speech AI APIs — text-to-speech intelligibility and latency, speech-to-text word accuracy and latency, per-unit catalog cost, and speech-to-speech realtime capability.",
    introduction:
      "This report compares speech APIs by **mechanically verifiable** behavior only — a fixed speech-to-text judge reads synthesized audio and word-accuracy is computed against a reference; no naturalness (MOS) or other subjective listening judgement enters the scores.",
    purpose:
      "The purpose is to record which speech APIs exist across text-to-speech, speech-to-text, and speech-to-speech, what each unit costs, how fast a call returns, and how accurately audio is transcribed — the properties that decide integration choices.",
    targetModels: `The subjects are the speech models in the curated registry (\`packages/tech/src/speech/models.ts\`): text-to-speech and speech-to-text APIs, each with a cited source and last-verified date. Speech-to-speech is cataloged as a realtime capability, and its round-trip first-audio latency is measured for providers with a wired realtime adapter (section 7).

${nonSubjectLines(result)}`,
    targetMetrics:
      "Measured metrics are call latency (ms, lower is better), text-to-speech intelligibility (word-accuracy of a fixed STT judge's transcription vs the synthesized text, higher is better), speech-to-text word accuracy (1 − word error rate vs a reference transcript, higher is better), and speech-to-speech round-trip first-audio latency (ms from committing a short input turn to the first audio-output chunk over a realtime duplex session, lower is better). Per-character and per-minute prices are curated catalog data (reference), not measurements.",
    scopeAndConstraints: `- **Mechanically scored only.** Quality is word-accuracy against a reference; the instrument never scores naturalness or voice quality. Swapping the STT judge (\`${escapeCell(result.judgeModel)}\`) is an instrument change, not a routine update.
- Manifest version \`${result.manifestVersion}\`: ${SPEECH_MANIFEST.tts.length} text-to-speech utterance(s) and ${SPEECH_MANIFEST.stt.length} speech-to-text reference clip(s). History connects same-manifest-version points only.
- **Audio binaries are not committed.** The artifact records byte length, timing, transcriptions, and scores — enough to regenerate this page — never the audio itself. A real speech-to-text run reads reference clips from \`SPEECH_AUDIO_DIR\` (see the manifest's cited public-domain source).
- The fixture path is keyless and deterministic. Real adapters are wired for OpenAI, ElevenLabs, Google, Deepgram, and AssemblyAI (TTS/STT REST) and for OpenAI Realtime and Google Gemini Live (STS round-trip); each row measures only when its provider key is present, otherwise it is an honest \`error\` row. Amazon (SigV4) and xAI stay unwired. Real numbers appear only after an owner runs the real path within the approved ceiling (run \`--estimate\` first).
- Point-in-time: each measured row records its own \`measuredAt\` in the artifact (a frame may carry rows measured on different dates — e.g. a speech-to-speech round-trip added to a survey whose text-to-speech/speech-to-text rows stand from the prior run); catalog prices are as of each row's last-verified date. This frame's generated timestamp is \`${result.generatedAt}\`.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared within a capability on latency and word-accuracy; price is catalog context. Contrasting text-to-speech intelligibility with speech-to-text word accuracy localizes where error enters — synthesis clarity versus recognition."
      : "This run has no measured rows; every subject was fixtured or errored, so no cross-model claim is made. The committed fixture page exists to prove the pipeline, not to compare providers.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- speech --fixture

# Cost preview, then the owner-gated real run (OpenAI adapters wired):
npm run research -- speech --estimate
SPEECH_AUDIO_DIR=./audio OPENAI_API_KEY=... npm run research -- speech --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills text-to-speech per character plus one STT-judge read of each synthesized clip, speech-to-text per audio minute (see the per-subject catalog prices), and speech-to-speech per realtime token (a short round-trip turn, estimated conservatively as a flat per-turn figure); the agreed ceiling is $10 per trial and `--estimate` must run first.",
    cleanup:
      "No external resources are created. Synthesized and reference audio are held in memory for scoring and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-subject results**

${modelTable(result)}

**Speech-to-speech (cataloged capability + measured round-trip)**

The round-trip is the first-audio latency after committing one short text input turn over a realtime duplex session (a control simplification that keeps the measurement reproducible without a committed audio clip). Providers without a wired realtime adapter, or without a present key, are honest \`error\` / not-attempted rows.

${stsTable(result)}

**Utterance manifest (version ${result.manifestVersion})**

${manifestTable()}

**Judge provenance.** Every text-to-speech output was read by \`${escapeCell(result.judgeModel)}\`; each call's transcription and scores are preserved verbatim in the artifact.

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-call latencies, audio byte lengths, transcriptions, and scores.

Generated: ${result.generatedAt}`,
  });
