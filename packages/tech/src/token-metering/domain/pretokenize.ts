/**
 * Pre-tokenization: the regex pass that splits text into word-ish pieces
 * BEFORE byte-pair merging. Published BPE tokenizers pair their merge table
 * with a specific pattern, so counting with the wrong pattern miscounts even
 * with the right vocabulary — the pattern is part of the instrument.
 *
 * The patterns are kept as data (regex source strings): the OpenAI encodings
 * publish theirs alongside the vocabulary, and Hugging Face `tokenizer.json`
 * files carry theirs in `pre_tokenizer`. Node 24's RegExp supports the
 * `(?i:...)` inline-modifier groups these patterns use.
 */

/** o200k_base's published pattern (OpenAI's current text encodings). */
export const O200K_PRETOKEN_PATTERN = [
  "[^\\r\\n\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]*[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]+(?i:'s|'t|'re|'ve|'m|'ll|'d)?",
  "[^\\r\\n\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]+[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]*(?i:'s|'t|'re|'ve|'m|'ll|'d)?",
  "\\p{N}{1,3}",
  " ?[^\\s\\p{L}\\p{N}]+[\\r\\n/]*",
  "\\s*[\\r\\n]+",
  "\\s+(?!\\S)",
  "\\s+",
].join("|");

/** GPT-2's pattern: the default for byte-level `tokenizer.json` files that do
 * not carry an explicit `Split` pre-tokenizer of their own. */
export const GPT2_PRETOKEN_PATTERN =
  "'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+";

/**
 * Split `text` into consecutive pre-tokens with `pattern`. The published
 * patterns tile their input (every character belongs to exactly one match);
 * any gap a foreign pattern leaves is preserved as its own piece so the count
 * degrades to "one token per leftover character" instead of silently dropping
 * text — a counting harness must never count fewer characters than it was
 * given.
 */
export const splitPretokens = (
  text: string,
  pattern: string,
): ReadonlyArray<string> => {
  const regex = new RegExp(pattern, "gu");
  const pieces: string[] = [];
  let cursor = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > cursor) pieces.push(text.slice(cursor, match.index));
    if (match[0] !== "") pieces.push(match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces;
};
