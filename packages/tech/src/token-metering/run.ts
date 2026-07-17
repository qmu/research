import { countContentTokens, type BpeVocabulary } from "./domain/bpe";
import {
  classErrorStats,
  errorPct,
  fitCalibration,
  predictTokens,
} from "./domain/estimator";
import type {
  EdgeProbeResults,
  FamilyCard,
  FamilyMeasurement,
  SampleCountRow,
  TokenMeteringResult,
  TokenSample,
} from "./domain/types";
import {
  FAMILY_CARDS,
  FIXTURE_OVERHEAD_TOKENS,
  FIXTURE_RATES,
  FIXTURE_TIMESTAMP,
  OPENAI_OUTPUT_COST_PER_MTOK,
  TOKEN_METERING_INSTRUMENT_VERSION,
} from "./models";
import {
  ACCURACY_TARGET_PCT,
  TOKEN_SAMPLES,
  TOKEN_SAMPLES_VERSION,
} from "./samples";

/** One ground-truth reading for one text: the provider-reported token count
 * and what the reading itself cost (0 for unbilled count endpoints). */
export type ApiCountReading = Readonly<{ tokens: number; costUsd: number }>;

export type ApiCountProbe = (text: string) => Promise<ApiCountReading>;

/** Injection points: tests and the fixture path supply deterministic
 * implementations; the real path wires the vendor ACLs. */
export type ProbeFactory = (card: FamilyCard) => ApiCountProbe | undefined;

export type VocabularySource = (
  card: FamilyCard,
) => Promise<BpeVocabulary | undefined>;

export type EdgeProbeRunner = () => Promise<EdgeProbeResults>;

export type TokenMeteringRunOptions = Readonly<{
  fixture: boolean;
  probeFactory?: ProbeFactory;
  vocabularySource?: VocabularySource;
  edgeProbeRunner?: EdgeProbeRunner;
  familyIds?: ReadonlyArray<string>;
}>;

const codePointLength = (text: string): number => Array.from(text).length;

const utf8ByteLength = (text: string): number =>
  new TextEncoder().encode(text).length;

/** The keyless fixture vocabulary: every byte is its own token (rank = byte
 * value, no merges). Deterministic and clearly synthetic — the self-count
 * equals the UTF-8 byte length, which proves the counting plumbing without
 * imitating a real vocabulary. */
export const fixtureVocabulary = (): BpeVocabulary => {
  const ranks = new Map<string, number>();
  for (let byte = 0; byte < 256; byte += 1) {
    ranks.set(String.fromCharCode(byte), byte);
  }
  return { kind: "ranked-bytes", ranks, pretokenPattern: "[\\s\\S]" };
};

/** The keyless fixture ground truth: byte count (exact families) or a fixed
 * per-class rate (estimator families), plus a fixed wrapper overhead. */
export const fixtureProbeFactory: ProbeFactory = (card) => (text) =>
  Promise.resolve({
    tokens:
      card.countingMethod === "exact-bpe"
        ? utf8ByteLength(text) + FIXTURE_OVERHEAD_TOKENS
        : Math.round(FIXTURE_RATES[classOfText(text)] * codePointLength(text)) +
          FIXTURE_OVERHEAD_TOKENS,
    costUsd: 0,
  });

/** Fixture rates are keyed by sample class; recover it from the manifest so
 * the fixture probe stays a pure function of the text. */
const classOfText = (text: string): TokenSample["class"] =>
  TOKEN_SAMPLES.find((sample) => sample.text === text)?.class ?? "english";

const selectCards = (
  familyIds?: ReadonlyArray<string>,
): ReadonlyArray<FamilyCard> =>
  familyIds === undefined
    ? FAMILY_CARDS
    : FAMILY_CARDS.filter((card) => familyIds.includes(card.id));

const unreachableFamily = (
  card: FamilyCard,
  reason: string,
): FamilyMeasurement => ({
  card,
  provenance: "unreachable",
  rows: [],
  perClass: classErrorStats([], ACCURACY_TARGET_PCT),
  spendUsd: 0,
  error: reason,
});

const baseRow = (sample: TokenSample): Omit<SampleCountRow, "provenance"> => ({
  sampleId: sample.id,
  class: sample.class,
  role: sample.role,
  chars: codePointLength(sample.text),
  utf8Bytes: utf8ByteLength(sample.text),
});

const measureFamily = async (
  card: FamilyCard,
  probe: ApiCountProbe,
  vocabulary: BpeVocabulary | undefined,
  fixture: boolean,
): Promise<FamilyMeasurement> => {
  const rows: SampleCountRow[] = [];
  let spendUsd = 0;
  for (const sample of TOKEN_SAMPLES) {
    const selfContentTokens =
      vocabulary === undefined
        ? undefined
        : countContentTokens(vocabulary, sample.text);
    try {
      const reading = await probe(sample.text);
      spendUsd += reading.costUsd;
      rows.push({
        ...baseRow(sample),
        ...(selfContentTokens === undefined ? {} : { selfContentTokens }),
        apiTokens: reading.tokens,
        provenance: fixture ? "fixtured" : "measured",
      });
    } catch (error: unknown) {
      // A failed reading never fakes a count: the row records the error and
      // drops out of calibration and holdout statistics.
      rows.push({
        ...baseRow(sample),
        ...(selfContentTokens === undefined ? {} : { selfContentTokens }),
        provenance: "error",
        error: String(error),
      });
    }
  }

  const calibrationRows = rows.filter(
    (row) => row.role === "calibration" && row.apiTokens !== undefined,
  );
  if (calibrationRows.length === 0) {
    return {
      card,
      provenance: "error",
      rows,
      perClass: classErrorStats(rows, ACCURACY_TARGET_PCT),
      spendUsd,
      error: "no calibration row obtained an API count",
    };
  }
  const calibration = fitCalibration(
    calibrationRows.map((row) => ({
      class: row.class,
      chars: row.chars,
      apiTokens: row.apiTokens ?? 0,
      ...(row.selfContentTokens === undefined
        ? {}
        : { selfContentTokens: row.selfContentTokens }),
    })),
  );
  const predicted = rows.map((row) => {
    if (row.apiTokens === undefined) return row;
    const prediction = predictTokens(calibration, row);
    return {
      ...row,
      predictedTokens: prediction,
      errorPct: Math.round(errorPct(prediction, row.apiTokens) * 100) / 100,
    };
  });
  const perClass = classErrorStats(predicted, ACCURACY_TARGET_PCT);
  const holdoutErrors = predicted
    .filter((row) => row.role === "holdout" && row.errorPct !== undefined)
    .map((row) => Math.abs(row.errorPct ?? 0));
  const round2 = (value: number): number => Math.round(value * 100) / 100;
  return {
    card,
    provenance: fixture ? "fixtured" : "measured",
    rows: predicted,
    calibration,
    perClass,
    holdoutMeanAbsErrorPct: round2(
      holdoutErrors.length === 0
        ? 0
        : holdoutErrors.reduce((sum, value) => sum + value, 0) /
            holdoutErrors.length,
    ),
    holdoutMaxAbsErrorPct: round2(
      holdoutErrors.length === 0 ? 0 : Math.max(...holdoutErrors),
    ),
    withinTarget:
      holdoutErrors.length > 0 && perClass.every((stat) => stat.withinTarget),
    spendUsd: Math.round(spendUsd * 10_000) / 10_000, // keep sub-cent spends visible
  };
};

export const runTokenMetering = async (
  options: TokenMeteringRunOptions,
): Promise<TokenMeteringResult> => {
  const { fixture } = options;
  const probeFactory =
    options.probeFactory ?? (fixture ? fixtureProbeFactory : () => undefined);
  const vocabularySource =
    options.vocabularySource ??
    (fixture
      ? (card: FamilyCard) =>
          Promise.resolve(
            card.countingMethod === "exact-bpe"
              ? fixtureVocabulary()
              : undefined,
          )
      : () => Promise.resolve(undefined));

  const families: FamilyMeasurement[] = [];
  for (const card of selectCards(options.familyIds)) {
    const probe = probeFactory(card);
    if (probe === undefined) {
      families.push(
        unreachableFamily(card, "no probe (missing credential or adapter)"),
      );
      continue;
    }
    let vocabulary: BpeVocabulary | undefined;
    if (card.countingMethod === "exact-bpe") {
      try {
        vocabulary = await vocabularySource(card);
      } catch (error: unknown) {
        families.push(
          unreachableFamily(card, `vocabulary unavailable: ${String(error)}`),
        );
        continue;
      }
      if (vocabulary === undefined) {
        families.push(unreachableFamily(card, "vocabulary unavailable"));
        continue;
      }
    }
    families.push(await measureFamily(card, probe, vocabulary, fixture));
  }

  const edgeProbes =
    options.edgeProbeRunner === undefined
      ? ({
          notes: [
            fixture
              ? "edge probes run only on the real path (they read live count endpoints)"
              : "edge probes unavailable (no runner wired)",
          ],
        } satisfies EdgeProbeResults)
      : await options.edgeProbeRunner();

  return {
    generatedAt: fixture ? FIXTURE_TIMESTAMP : new Date().toISOString(),
    fixture,
    instrumentVersion: Number(TOKEN_METERING_INSTRUMENT_VERSION),
    samplesVersion: TOKEN_SAMPLES_VERSION,
    accuracyTargetPct: ACCURACY_TARGET_PCT,
    families,
    edgeProbes,
    spendUsd:
      Math.round(
        families.reduce((sum, family) => sum + family.spendUsd, 0) * 10_000,
      ) / 10_000,
    artifactPath: "token-metering-comparison.data.json",
  };
};

/**
 * Cost/ETA preview for a real run. Two of the four ground-truth sources are
 * unbilled count endpoints; the two usage-field probes bill the samples' input
 * tokens (approximated at 1 token per 3 UTF-8 bytes plus wrapper overhead)
 * and a clamped completion. An order-of-magnitude figure, labelled as such.
 */
export const estimateTokenMetering = (
  familyIds?: ReadonlyArray<string>,
): string => {
  const cards = selectCards(familyIds);
  const approxPromptTokens = TOKEN_SAMPLES.reduce(
    (sum, sample) => sum + Math.ceil(utf8ByteLength(sample.text) / 3) + 10,
    0,
  );
  const lines = cards.map((card) => {
    if (card.groundTruth === "count-tokens-endpoint") {
      return `  ${card.id}: ${TOKEN_SAMPLES.length} count-endpoint reads — unbilled ($0)`;
    }
    const inputUsd = (approxPromptTokens * card.inputCostPerMTok) / 1_000_000;
    const outputUsd =
      card.id === "openai-gpt"
        ? (TOKEN_SAMPLES.length * 16 * OPENAI_OUTPUT_COST_PER_MTOK) / 1_000_000
        : 0;
    return `  ${card.id}: ${TOKEN_SAMPLES.length} usage probes, ~${approxPromptTokens} prompt tokens — ~$${(inputUsd + outputUsd).toFixed(4)}`;
  });
  const total = cards.reduce((sum, card) => {
    if (card.groundTruth === "count-tokens-endpoint") return sum;
    const inputUsd = (approxPromptTokens * card.inputCostPerMTok) / 1_000_000;
    const outputUsd =
      card.id === "openai-gpt"
        ? (TOKEN_SAMPLES.length * 16 * OPENAI_OUTPUT_COST_PER_MTOK) / 1_000_000
        : 0;
    return sum + inputUsd + outputUsd;
  }, 0);
  return [
    `token-metering estimate: ${cards.length} families × ${TOKEN_SAMPLES.length} samples (manifest ${TOKEN_SAMPLES_VERSION})`,
    ...lines,
    `  edge probes (tool/image counts): unbilled count-endpoint reads ($0)`,
    `  approx benchmark API cost: ~$${total.toFixed(4)} (order-of-magnitude; insights/translation stages are estimated by their own pipeline stages)`,
    `  NOTE: run --estimate before every real run; the mission's approved ceiling is $5 total.`,
  ].join("\n");
};
