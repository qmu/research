import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  parseTiktokenVocabulary,
  parseTokenizerJson,
  type BpeVocabulary,
} from "../../token-metering/domain/bpe";
import {
  GPT2_PRETOKEN_PATTERN,
  O200K_PRETOKEN_PATTERN,
} from "../../token-metering/domain/pretokenize";
import type { FamilyCard } from "../../token-metering/domain/types";
import type { VocabularySource } from "../../token-metering/run";
import { VOCABULARY_SOURCES } from "../../token-metering/models";

/**
 * Published-vocabulary access for the exact-BPE families. These are DATA
 * downloads (o200k_base's ranked byte list; Qwen2.5's tokenizer.json), not
 * library dependencies — recorded in docs/dependency-decisions.md. Files are
 * cached under packages/tech/.cache/token-metering/ (gitignored) so a repeat
 * run is offline; parsing stays in the pure domain module.
 */
const cacheDirectory = (): string =>
  resolve(process.cwd(), ".cache/token-metering");

const fetchTextCached = async (
  url: string,
  cacheName: string,
): Promise<string> => {
  const directory = cacheDirectory();
  const cachePath = resolve(directory, cacheName);
  try {
    return await readFile(cachePath, "utf8");
  } catch {
    // Cache miss: fall through to the network fetch below.
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`vocabulary fetch failed: ${response.status} for ${url}`);
  }
  const text = await response.text();
  await mkdir(directory, { recursive: true });
  await writeFile(cachePath, text, "utf8");
  return text;
};

/** The real-path vocabulary source: resolves each exact family's published
 * vocabulary; estimator families resolve to undefined (no vocabulary exists). */
export const publishedVocabularySource: VocabularySource = async (
  card: FamilyCard,
): Promise<BpeVocabulary | undefined> => {
  const url = VOCABULARY_SOURCES[card.id];
  if (url === undefined) return undefined;
  if (card.id === "openai-gpt") {
    const text = await fetchTextCached(url, "o200k_base.tiktoken");
    return parseTiktokenVocabulary(text, O200K_PRETOKEN_PATTERN);
  }
  const text = await fetchTextCached(url, "qwen2.5-coder-tokenizer.json");
  return parseTokenizerJson(JSON.parse(text), GPT2_PRETOKEN_PATTERN);
};
