import { describe, expect, it } from "vitest";
import {
  DEFAULT_AURA_VOICE,
  deepgramListenUrl,
  deepgramSpeakModel,
  deepgramSpeakUrl,
  extractDeepgramTranscript,
} from "./deepgram";

describe("deepgram request builders", () => {
  it("maps the registry aura-2 id to a concrete voice model", () => {
    expect(deepgramSpeakModel("aura-2")).toBe(DEFAULT_AURA_VOICE);
    expect(deepgramSpeakModel("aura-2-luna-en")).toBe("aura-2-luna-en");
  });

  it("requests mp3 speak output for the mapped voice", () => {
    expect(deepgramSpeakUrl("aura-2")).toBe(
      `https://api.deepgram.com/v1/speak?model=${DEFAULT_AURA_VOICE}&encoding=mp3`,
    );
  });

  it("disables punctuation and smart-formatting on listen", () => {
    const url = deepgramListenUrl("nova-3");
    expect(url).toContain("model=nova-3");
    expect(url).toContain("punctuate=false");
    expect(url).toContain("smart_format=false");
  });
});

describe("extractDeepgramTranscript", () => {
  it("reads the first channel's first alternative transcript", () => {
    expect(
      extractDeepgramTranscript({
        results: {
          channels: [{ alternatives: [{ transcript: "the birch canoe" }] }],
        },
      }),
    ).toBe("the birch canoe");
  });

  it("is total over missing / malformed shapes", () => {
    expect(extractDeepgramTranscript(null)).toBe("");
    expect(extractDeepgramTranscript({})).toBe("");
    expect(extractDeepgramTranscript({ results: {} })).toBe("");
    expect(extractDeepgramTranscript({ results: { channels: [] } })).toBe("");
    expect(
      extractDeepgramTranscript({
        results: { channels: [{ alternatives: [] }] },
      }),
    ).toBe("");
    expect(
      extractDeepgramTranscript({
        results: { channels: [{ alternatives: [{ transcript: 42 }] }] },
      }),
    ).toBe("");
  });
});
