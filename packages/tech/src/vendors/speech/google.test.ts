import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEURAL2_VOICE,
  extractGoogleAudioContent,
  extractGoogleTranscript,
  googleRecognizeBody,
  googleSynthesisBody,
  googleVoiceName,
} from "./google";

describe("google synthesis request", () => {
  it("maps the registry Neural2 id to a concrete voice name", () => {
    expect(googleVoiceName("Neural2")).toBe(DEFAULT_NEURAL2_VOICE);
    expect(googleVoiceName("en-US-Wavenet-D")).toBe("en-US-Wavenet-D");
  });

  it("builds an MP3 synthesis body with the mapped voice", () => {
    expect(JSON.parse(googleSynthesisBody("Neural2", "hello"))).toEqual({
      input: { text: "hello" },
      voice: { languageCode: "en-US", name: DEFAULT_NEURAL2_VOICE },
      audioConfig: { audioEncoding: "MP3" },
    });
  });
});

describe("googleRecognizeBody", () => {
  it("omits encoding for WAV so Google reads the RIFF header", () => {
    const body = JSON.parse(
      googleRecognizeBody("chirp", { base64: "AAAA", mimeType: "audio/wav" }),
    );
    expect(body.config).toEqual({ languageCode: "en-US", model: "chirp" });
    expect(body.audio).toEqual({ content: "AAAA" });
  });

  it("sets FLAC encoding for a flac clip", () => {
    const body = JSON.parse(
      googleRecognizeBody("chirp", { base64: "BBBB", mimeType: "audio/flac" }),
    );
    expect(body.config.encoding).toBe("FLAC");
  });
});

describe("extractGoogleAudioContent", () => {
  it("reads audioContent base64", () => {
    expect(extractGoogleAudioContent({ audioContent: "SGVsbG8=" })).toBe(
      "SGVsbG8=",
    );
  });

  it("is total over missing / malformed shapes", () => {
    expect(extractGoogleAudioContent(null)).toBe("");
    expect(extractGoogleAudioContent({})).toBe("");
    expect(extractGoogleAudioContent({ audioContent: 5 })).toBe("");
  });
});

describe("extractGoogleTranscript", () => {
  it("joins the first alternative of each result", () => {
    expect(
      extractGoogleTranscript({
        results: [
          { alternatives: [{ transcript: "the birch canoe" }] },
          { alternatives: [{ transcript: " slid on the planks" }] },
        ],
      }),
    ).toBe("the birch canoe slid on the planks");
  });

  it("is total over missing / malformed shapes", () => {
    expect(extractGoogleTranscript(null)).toBe("");
    expect(extractGoogleTranscript({})).toBe("");
    expect(extractGoogleTranscript({ results: [] })).toBe("");
    expect(extractGoogleTranscript({ results: [{ alternatives: [] }] })).toBe(
      "",
    );
    expect(
      extractGoogleTranscript({
        results: [{ alternatives: [{ transcript: 1 }] }],
      }),
    ).toBe("");
  });
});
