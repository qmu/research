import { describe, expect, it } from "vitest";
import {
  countContentTokens,
  parseTiktokenVocabulary,
  parseTokenizerJson,
  type MergeListVocabulary,
  type RankedBytesVocabulary,
} from "./bpe";
import {
  GPT2_PRETOKEN_PATTERN,
  O200K_PRETOKEN_PATTERN,
  splitPretokens,
} from "./pretokenize";

const rankedVocabulary = (
  entries: ReadonlyArray<readonly [string, number]>,
): RankedBytesVocabulary => ({
  kind: "ranked-bytes",
  ranks: new Map(entries),
  pretokenPattern: GPT2_PRETOKEN_PATTERN,
});

describe("splitPretokens", () => {
  it("tiles its input: concatenating the pieces reproduces the text", () => {
    const text = "Hello world!  it's 2026\n日本語テキスト mixed_code(x) ";
    for (const pattern of [O200K_PRETOKEN_PATTERN, GPT2_PRETOKEN_PATTERN]) {
      expect(splitPretokens(text, pattern).join("")).toBe(text);
    }
  });

  it("keeps leading spaces attached to words (BPE convention)", () => {
    const pieces = splitPretokens("one two", GPT2_PRETOKEN_PATTERN);
    expect(pieces).toEqual(["one", " two"]);
  });

  it("supports the o200k inline-modifier contraction group", () => {
    const pieces = splitPretokens("it's", O200K_PRETOKEN_PATTERN);
    expect(pieces).toEqual(["it's"]);
  });

  it("preserves characters a foreign pattern leaves unmatched", () => {
    // A pattern that matches only latin letters leaves the rest as gaps.
    expect(splitPretokens("ab-cd", "[a-z]+").join("")).toBe("ab-cd");
  });
});

describe("countContentTokens (ranked-bytes)", () => {
  const singleBytes = (): ReadonlyArray<readonly [string, number]> => {
    const entries: (readonly [string, number])[] = [];
    for (let byte = 0; byte < 256; byte += 1) {
      entries.push([String.fromCharCode(byte), byte] as const);
    }
    return entries;
  };

  it("counts one token per byte when no merges exist", () => {
    const vocabulary = rankedVocabulary(singleBytes());
    expect(countContentTokens(vocabulary, "abc")).toBe(3);
  });

  it("replays the lowest-rank merge first", () => {
    // "ab" merges before "bc"; "abc" is not a token, so "abc" → ["ab","c"].
    const vocabulary = rankedVocabulary([
      ...singleBytes(),
      ["ab", 256],
      ["bc", 257],
    ]);
    expect(countContentTokens(vocabulary, "abc")).toBe(2);
  });

  it("returns 1 for a pre-token that is itself a token", () => {
    const vocabulary = rankedVocabulary([...singleBytes(), ["abc", 256]]);
    expect(countContentTokens(vocabulary, "abc")).toBe(1);
  });

  it("counts multi-byte UTF-8 text at the byte level", () => {
    const vocabulary = rankedVocabulary(singleBytes());
    // 日 is 3 UTF-8 bytes.
    expect(countContentTokens(vocabulary, "日")).toBe(3);
  });
});

describe("countContentTokens (merge-list)", () => {
  const vocabulary: MergeListVocabulary = {
    kind: "merge-list",
    // GPT-2 byte alphabet maps space to Ġ (U+0120).
    merges: new Map([
      ["h e", 0],
      ["l l", 1],
      ["he ll", 2],
      ["Ġ w", 3],
    ]),
    pretokenPattern: GPT2_PRETOKEN_PATTERN,
    normalizeNfc: true,
  };

  it("applies listed merges in order and counts the remaining parts", () => {
    // "hello" → h e l l o → he ll o → hell o = 2 parts.
    expect(countContentTokens(vocabulary, "hello")).toBe(2);
  });

  it("maps bytes through the GPT-2 byte-to-unicode alphabet", () => {
    // " w" pre-token becomes Ġw via the [Ġ w] merge = 1 part... plus "x" = 1.
    expect(countContentTokens(vocabulary, " wx")).toBe(2);
  });
});

describe("parseTiktokenVocabulary", () => {
  it("decodes base64 byte sequences with their ranks", () => {
    // "aGk=" is "hi"; "aA==" is "h"; "aQ==" is "i".
    const vocabulary = parseTiktokenVocabulary(
      "aA== 0\naQ== 1\naGk= 2\n",
      GPT2_PRETOKEN_PATTERN,
    );
    expect(vocabulary.ranks.get("hi")).toBe(2);
    expect(countContentTokens(vocabulary, "hi")).toBe(1);
  });
});

describe("parseTokenizerJson", () => {
  it("reads merges, the Split pattern, and NFC normalization", () => {
    const vocabulary = parseTokenizerJson(
      {
        normalizer: { type: "Sequence", normalizers: [{ type: "NFC" }] },
        pre_tokenizer: {
          type: "Sequence",
          pretokenizers: [
            {
              type: "Split",
              pattern: { Regex: "\\p{L}+|\\s+" },
              behavior: "Isolated",
            },
            { type: "ByteLevel", add_prefix_space: false },
          ],
        },
        model: { merges: [["h", "e"], "l l"] },
      },
      GPT2_PRETOKEN_PATTERN,
    );
    expect(vocabulary.normalizeNfc).toBe(true);
    expect(vocabulary.pretokenPattern).toBe("\\p{L}+|\\s+");
    expect(vocabulary.merges.get("h e")).toBe(0);
    expect(vocabulary.merges.get("l l")).toBe(1);
  });

  it("throws on a file without a merge list", () => {
    expect(() =>
      parseTokenizerJson({ model: {} }, GPT2_PRETOKEN_PATTERN),
    ).toThrow(/model\.merges/);
  });
});
