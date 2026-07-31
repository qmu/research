import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELEVENLABS_VOICE_ID,
  elevenLabsSynthesisRequest,
} from "./elevenlabs";

describe("elevenLabsSynthesisRequest", () => {
  it("targets the voice path with the api key header and model body", () => {
    const request = elevenLabsSynthesisRequest(
      "eleven_multilingual_v2",
      "hello world",
      "secret-key",
    );
    expect(request.url).toContain(
      `/text-to-speech/${DEFAULT_ELEVENLABS_VOICE_ID}`,
    );
    expect(request.url).toContain("output_format=mp3_44100_128");
    expect(request.headers["xi-api-key"]).toBe("secret-key");
    expect(request.headers.Accept).toBe("audio/mpeg");
    expect(JSON.parse(request.body)).toEqual({
      text: "hello world",
      model_id: "eleven_multilingual_v2",
    });
  });

  it("honors an explicit voice id", () => {
    const request = elevenLabsSynthesisRequest(
      "eleven_multilingual_v2",
      "hi",
      "k",
      "custom-voice",
    );
    expect(request.url).toContain("/text-to-speech/custom-voice");
  });
});
