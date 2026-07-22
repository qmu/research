import { describe, expect, it } from "vitest";
import {
  openAiFirstAudio,
  openAiIsReady,
  openAiRealtimeHeaders,
  openAiRealtimeUrl,
  openAiServerError,
  openAiTurnMessages,
} from "./openai-realtime";

describe("openai realtime protocol builders", () => {
  it("targets the realtime endpoint for a model", () => {
    expect(openAiRealtimeUrl("gpt-realtime")).toBe(
      "wss://api.openai.com/v1/realtime?model=gpt-realtime",
    );
  });

  it("sends bearer auth alone (no retired realtime beta header)", () => {
    expect(openAiRealtimeHeaders("sk-xyz")).toEqual({
      Authorization: "Bearer sk-xyz",
    });
  });

  it("commits a text turn then asks for an audio response", () => {
    const [item, response] = openAiTurnMessages("hello there") as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(item.type).toBe("conversation.item.create");
    expect(response.type).toBe("response.create");
    expect(
      (response.response as { output_modalities?: unknown }).output_modalities,
    ).toContain("audio");
    expect(JSON.stringify(item)).toContain("hello there");
  });

  it("is ready only on session.created", () => {
    expect(openAiIsReady({ type: "session.created" })).toBe(true);
    expect(openAiIsReady({ type: "session.updated" })).toBe(false);
    expect(openAiIsReady({})).toBe(false);
    expect(openAiIsReady(null)).toBe(false);
  });

  it("recognizes both audio-delta event names, ignores non-audio deltas", () => {
    expect(
      openAiFirstAudio({ type: "response.audio.delta", delta: "AAAA" }),
    ).toBe("AAAA");
    expect(
      openAiFirstAudio({ type: "response.output_audio.delta", delta: "BBBB" }),
    ).toBe("BBBB");
    expect(
      openAiFirstAudio({ type: "response.text.delta", delta: "hi" }),
    ).toBeUndefined();
    expect(openAiFirstAudio({ type: "response.audio.done" })).toBeUndefined();
    expect(openAiFirstAudio(null)).toBeUndefined();
  });

  it("surfaces a server error message", () => {
    expect(
      openAiServerError({ type: "error", error: { message: "bad session" } }),
    ).toBe("bad session");
    expect(openAiServerError({ type: "error", error: {} })).toBe(
      "unspecified realtime error",
    );
    expect(openAiServerError({ type: "response.created" })).toBeUndefined();
  });
});
