import { describe, expect, it } from "vitest";
import {
  geminiFirstAudio,
  geminiIsReady,
  geminiLiveUrl,
  geminiServerError,
  geminiSetupMessage,
  geminiTurnMessage,
} from "./gemini-live";

describe("gemini live protocol builders", () => {
  it("puts the api key in the query string", () => {
    expect(geminiLiveUrl("api-key-123")).toContain("?key=api-key-123");
    expect(geminiLiveUrl("a/b")).toContain("?key=a%2Fb");
  });

  it("requests AUDIO output and prefixes the model with models/", () => {
    const setup = geminiSetupMessage("gemini-2.5-flash-native-audio") as {
      setup: {
        model: string;
        generationConfig: { responseModalities: string[] };
      };
    };
    expect(setup.setup.model).toBe("models/gemini-2.5-flash-native-audio");
    expect(setup.setup.generationConfig.responseModalities).toEqual(["AUDIO"]);
    // An already-prefixed id is left as-is.
    expect(
      (geminiSetupMessage("models/x") as { setup: { model: string } }).setup
        .model,
    ).toBe("models/x");
  });

  it("commits a completed text turn", () => {
    const turn = geminiTurnMessage("hi") as {
      clientContent: { turnComplete: boolean };
    };
    expect(turn.clientContent.turnComplete).toBe(true);
    expect(JSON.stringify(turn)).toContain("hi");
  });

  it("is ready on setupComplete", () => {
    expect(geminiIsReady({ setupComplete: {} })).toBe(true);
    expect(geminiIsReady({ serverContent: {} })).toBe(false);
    expect(geminiIsReady(null)).toBe(false);
  });

  it("reads the first inline audio part, total over malformed shapes", () => {
    expect(
      geminiFirstAudio({
        serverContent: {
          modelTurn: {
            parts: [
              { text: "greeting" },
              { inlineData: { mimeType: "audio/pcm", data: "QUJD" } },
            ],
          },
        },
      }),
    ).toBe("QUJD");
    // A non-audio inline part is not treated as audio.
    expect(
      geminiFirstAudio({
        serverContent: {
          modelTurn: {
            parts: [{ inlineData: { mimeType: "image/png", data: "X" } }],
          },
        },
      }),
    ).toBeUndefined();
    expect(geminiFirstAudio({})).toBeUndefined();
    expect(
      geminiFirstAudio({ serverContent: { modelTurn: {} } }),
    ).toBeUndefined();
    expect(geminiFirstAudio(null)).toBeUndefined();
  });

  it("surfaces a server error message", () => {
    expect(geminiServerError({ error: { message: "invalid model" } })).toBe(
      "invalid model",
    );
    expect(geminiServerError({ error: {} })).toBe("unspecified Live error");
    expect(geminiServerError({ setupComplete: {} })).toBeUndefined();
  });
});
