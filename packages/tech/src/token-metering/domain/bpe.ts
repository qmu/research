import { splitPretokens } from "./pretokenize";

/**
 * A self-implemented byte-pair-encoding token counter — no tokenizer library
 * at runtime. Two published vocabulary formats are supported, because the two
 * exact-count families publish differently:
 *
 * - `ranked-bytes` (OpenAI's `.tiktoken` files): every token is a byte
 *   sequence with a rank; merging replays "merge the adjacent pair whose
 *   concatenation has the lowest rank" until no concatenation is a token.
 * - `merge-list` (Hugging Face `tokenizer.json`): tokens are strings over the
 *   GPT-2 byte-to-unicode alphabet and the merge table is an ordered pair
 *   list; merging replays "apply the earliest-listed adjacent pair" until no
 *   listed pair remains.
 *
 * Both loops are the reference BPE inference algorithm; only the counting
 * result (number of parts) is needed, so token ids are never materialized.
 */

export type RankedBytesVocabulary = Readonly<{
  kind: "ranked-bytes";
  /** Byte sequence (latin1-keyed string, one char per byte) → merge rank. */
  ranks: ReadonlyMap<string, number>;
  pretokenPattern: string;
}>;

export type MergeListVocabulary = Readonly<{
  kind: "merge-list";
  /** "left right" (space-joined pair) → merge priority (list position). */
  merges: ReadonlyMap<string, number>;
  pretokenPattern: string;
  /** Apply Unicode NFC before splitting (declared by the tokenizer file). */
  normalizeNfc: boolean;
}>;

export type BpeVocabulary = RankedBytesVocabulary | MergeListVocabulary;

/** UTF-8 bytes of `text` as latin1 symbols, one string char per byte. */
const utf8Symbols = (text: string): string[] => {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (byte) => String.fromCharCode(byte));
};

/**
 * GPT-2's byte-to-unicode table: printable latin bytes map to themselves,
 * every other byte to a private printable codepoint starting at U+0100. This
 * is the alphabet `tokenizer.json` vocabularies are written in.
 */
const byteToUnicode = (): ReadonlyArray<string> => {
  const direct: number[] = [];
  for (let byte = 0x21; byte <= 0x7e; byte += 1) direct.push(byte);
  for (let byte = 0xa1; byte <= 0xac; byte += 1) direct.push(byte);
  for (let byte = 0xae; byte <= 0xff; byte += 1) direct.push(byte);
  const table: string[] = [];
  let next = 0;
  for (let byte = 0; byte < 256; byte += 1) {
    if (direct.includes(byte)) {
      table.push(String.fromCharCode(byte));
    } else {
      table.push(String.fromCharCode(256 + next));
      next += 1;
    }
  }
  return table;
};

const BYTE_TO_UNICODE = byteToUnicode();

const byteLevelSymbols = (text: string): string[] => {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (byte) => BYTE_TO_UNICODE[byte] ?? "");
};

/** Replay merges over `parts`, always taking the lowest-priority-value merge
 * first; `priorityOf` returns undefined when a pair can no longer merge. */
const mergeParts = (
  parts: string[],
  priorityOf: (left: string, right: string) => number | undefined,
): number => {
  while (parts.length > 1) {
    let bestIndex = -1;
    let bestPriority = Number.POSITIVE_INFINITY;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const left = parts[index] ?? "";
      const right = parts[index + 1] ?? "";
      const priority = priorityOf(left, right);
      if (priority !== undefined && priority < bestPriority) {
        bestPriority = priority;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) break;
    parts.splice(
      bestIndex,
      2,
      (parts[bestIndex] ?? "") + (parts[bestIndex + 1] ?? ""),
    );
  }
  return parts.length;
};

const countRankedBytes = (
  vocabulary: RankedBytesVocabulary,
  pretoken: string,
): number => {
  const symbols = utf8Symbols(pretoken);
  // A pre-token that IS a token needs no merging (the common fast path, and
  // also the correct answer when merging could not reach it).
  if (vocabulary.ranks.has(symbols.join(""))) return 1;
  return mergeParts(symbols, (left, right) =>
    vocabulary.ranks.get(left + right),
  );
};

const countMergeList = (
  vocabulary: MergeListVocabulary,
  pretoken: string,
): number =>
  mergeParts(byteLevelSymbols(pretoken), (left, right) =>
    vocabulary.merges.get(`${left} ${right}`),
  );

/** Count the content tokens of `text` under a published vocabulary. Special
 * tokens never appear (plain content is counted), so none are handled. */
export const countContentTokens = (
  vocabulary: BpeVocabulary,
  text: string,
): number => {
  const prepared =
    vocabulary.kind === "merge-list" && vocabulary.normalizeNfc
      ? text.normalize("NFC")
      : text;
  const pretokens = splitPretokens(prepared, vocabulary.pretokenPattern);
  return pretokens.reduce(
    (total, pretoken) =>
      total +
      (vocabulary.kind === "ranked-bytes"
        ? countRankedBytes(vocabulary, pretoken)
        : countMergeList(vocabulary, pretoken)),
    0,
  );
};

/**
 * Parse an OpenAI `.tiktoken` vocabulary file: one `<base64 bytes> <rank>`
 * per line. Pure (the caller fetches and caches the text).
 */
export const parseTiktokenVocabulary = (
  fileText: string,
  pretokenPattern: string,
): RankedBytesVocabulary => {
  const ranks = new Map<string, number>();
  for (const line of fileText.split("\n")) {
    if (line.trim() === "") continue;
    const [encoded, rank] = line.split(" ");
    if (encoded === undefined || rank === undefined) continue;
    ranks.set(atob(encoded), Number(rank));
  }
  return { kind: "ranked-bytes", ranks, pretokenPattern };
};

type TokenizerJsonShape = Readonly<{
  normalizer?: unknown;
  pre_tokenizer?: unknown;
  model?: Readonly<{ merges?: unknown }>;
}>;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const mentionsNfc = (normalizer: unknown): boolean => {
  const record = asRecord(normalizer);
  if (record === undefined) return false;
  if (record.type === "NFC") return true;
  const nested = Array.isArray(record.normalizers) ? record.normalizers : [];
  return nested.some((entry) => mentionsNfc(entry));
};

const splitPatternOf = (preTokenizer: unknown): string | undefined => {
  const record = asRecord(preTokenizer);
  if (record === undefined) return undefined;
  if (record.type === "Split") {
    const pattern = asRecord(record.pattern);
    const regex = pattern?.Regex;
    return typeof regex === "string" ? regex : undefined;
  }
  const nested = Array.isArray(record.pretokenizers)
    ? record.pretokenizers
    : [];
  for (const entry of nested) {
    const found = splitPatternOf(entry);
    if (found !== undefined) return found;
  }
  return undefined;
};

/**
 * Parse a Hugging Face `tokenizer.json` into a merge-list vocabulary. The
 * merge table and the pre-tokenizer's own `Split` regex come from the file
 * itself (falling back to the GPT-2 pattern that byte-level tokenizers imply),
 * so the counter follows the model's published rules, not our assumptions.
 */
export const parseTokenizerJson = (
  parsed: unknown,
  fallbackPattern: string,
): MergeListVocabulary => {
  const shape = (parsed ?? {}) as TokenizerJsonShape;
  const rawMerges = shape.model?.merges;
  if (!Array.isArray(rawMerges)) {
    throw new Error("tokenizer.json has no model.merges list");
  }
  const merges = new Map<string, number>();
  rawMerges.forEach((entry, index) => {
    const pair = Array.isArray(entry) ? entry.join(" ") : String(entry);
    merges.set(pair, index);
  });
  return {
    kind: "merge-list",
    merges,
    pretokenPattern: splitPatternOf(shape.pre_tokenizer) ?? fallbackPattern,
    normalizeNfc: mentionsNfc(shape.normalizer),
  };
};
