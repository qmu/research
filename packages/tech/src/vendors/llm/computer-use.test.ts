import { describe, expect, it } from "vitest";
import {
  buildAnthropicComputerRequest,
  buildGoogleComputerRequest,
  buildOpenAiComputerRequest,
  extractAnthropicComputerAction,
  extractGoogleComputerAction,
  extractOpenAiComputerAction,
  rawToHarnessCommand,
} from "./computer-use";
import type { HarnessObservation } from "./types";

const observation = (
  over: Partial<HarnessObservation> = {},
): HarnessObservation => ({
  stepIndex: 0,
  url: "http://127.0.0.1/catalog.html",
  pageText: "",
  axSnapshot: "",
  viewport: { width: 1280, height: 800 },
  ...over,
});

describe("rawToHarnessCommand — neutral action → harness vocabulary", () => {
  it("maps a coordinate click to a point-addressed click", () => {
    expect(rawToHarnessCommand({ type: "click", x: 12, y: 34 })).toEqual({
      kind: "click",
      point: { x: 12, y: 34 },
    });
  });

  it("maps type / key / scroll / navigate / wait / finish", () => {
    expect(rawToHarnessCommand({ type: "type", text: "hi" })).toEqual({
      kind: "type",
      text: "hi",
    });
    expect(rawToHarnessCommand({ type: "key", key: "Enter" })).toEqual({
      kind: "key",
      key: "Enter",
    });
    expect(rawToHarnessCommand({ type: "scroll" })).toEqual({ kind: "scroll" });
    expect(
      rawToHarnessCommand({ type: "navigate", url: "/cart.html" }),
    ).toEqual({
      kind: "navigate",
      text: "/cart.html",
    });
    expect(rawToHarnessCommand({ type: "wait" })).toEqual({ kind: "wait" });
    expect(rawToHarnessCommand({ type: "finish" })).toEqual({ kind: "finish" });
  });
});

describe("extractAnthropicComputerAction", () => {
  it("reads a computer tool_use click + usage", () => {
    const turn = extractAnthropicComputerAction({
      usage: { input_tokens: 100, output_tokens: 20 },
      content: [
        {
          type: "tool_use",
          name: "computer",
          input: { action: "left_click", coordinate: [12, 34] },
        },
      ],
    });
    expect(turn).toEqual({
      raw: { type: "click", x: 12, y: 34 },
      inputTokens: 100,
      outputTokens: 20,
    });
  });

  it("reads a type action", () => {
    const turn = extractAnthropicComputerAction({
      usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: "tool_use", input: { action: "type", text: "QMU" } }],
    });
    expect(turn.raw).toEqual({ type: "type", text: "QMU" });
  });

  it("finishes when the response carries no tool_use", () => {
    const turn = extractAnthropicComputerAction({
      usage: {},
      content: [{ type: "text", text: "done" }],
    });
    expect(turn.raw).toEqual({ type: "finish" });
    expect(turn.inputTokens).toBe(0);
  });

  it("finishes on a malformed payload rather than throwing", () => {
    expect(extractAnthropicComputerAction(null).raw).toEqual({
      type: "finish",
    });
    expect(extractAnthropicComputerAction(42).raw).toEqual({ type: "finish" });
  });
});

describe("extractOpenAiComputerAction", () => {
  it("reads a computer_call action + usage", () => {
    const turn = extractOpenAiComputerAction({
      usage: { input_tokens: 50, output_tokens: 10 },
      output: [
        { type: "computer_call", action: { type: "click", x: 5, y: 6 } },
      ],
    });
    expect(turn).toEqual({
      raw: { type: "click", x: 5, y: 6 },
      inputTokens: 50,
      outputTokens: 10,
    });
  });

  it("finishes when there is no computer_call item", () => {
    const turn = extractOpenAiComputerAction({ output: [{ type: "message" }] });
    expect(turn.raw).toEqual({ type: "finish" });
    // A genuine stop (no computer_call) is not an unsupported action.
    expect(turn.unsupported).toBeUndefined();
  });

  it("flags a stateful `screenshot` computer_call as unsupported (not a stop)", () => {
    // The real first turn of the Responses computer-use protocol, captured live.
    const turn = extractOpenAiComputerAction({
      usage: { input_tokens: 40, output_tokens: 5 },
      output: [{ type: "computer_call", action: { type: "screenshot" } }],
    });
    expect(turn.raw).toEqual({ type: "finish" });
    expect(turn.unsupported).toBe("screenshot");
  });
});

describe("extractGoogleComputerAction", () => {
  it("reads a computer-use functionCall + usage", () => {
    const turn = extractGoogleComputerAction({
      usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 8 },
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "computer_use",
                  args: { action: "click", coordinate: { x: 7, y: 8 } },
                },
              },
            ],
          },
        },
      ],
    });
    expect(turn).toEqual({
      raw: { type: "click", x: 7, y: 8 },
      inputTokens: 30,
      outputTokens: 8,
    });
  });

  it("finishes on an empty candidate list", () => {
    const turn = extractGoogleComputerAction({ candidates: [] });
    expect(turn.raw).toEqual({ type: "finish" });
    expect(turn.unsupported).toBeUndefined();
  });

  it("flags a stateful `open_web_browser` functionCall as unsupported (not a stop)", () => {
    // The real first turn of the Gemini computer-use protocol, captured live.
    const turn = extractGoogleComputerAction({
      usageMetadata: { promptTokenCount: 1881, candidatesTokenCount: 12 },
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: "open_web_browser", args: {} } }],
          },
        },
      ],
    });
    expect(turn.raw).toEqual({ type: "finish" });
    expect(turn.unsupported).toBe("open_web_browser");
  });
});

describe("request builders embed the tool + the screenshot", () => {
  const obs = observation({ screenshotBase64: "AAAScreenshotBytes" });

  it("Anthropic request pins the tool version, display size, and screenshot", () => {
    const body = JSON.stringify(
      buildAnthropicComputerRequest(
        "claude-sonnet-5",
        "computer_20251124",
        "do it",
        obs,
      ),
    );
    expect(body).toContain("computer_20251124");
    expect(body).toContain("1280");
    expect(body).toContain("AAAScreenshotBytes");
  });

  it("OpenAI request declares the computer tool and a data-URL image", () => {
    const body = JSON.stringify(
      buildOpenAiComputerRequest("computer-use-preview", "do it", obs),
    );
    expect(body).toContain("computer_use_preview");
    expect(body).toContain("data:image/png;base64,AAAScreenshotBytes");
  });

  it("Google request declares computerUse and an inline image", () => {
    const body = JSON.stringify(
      buildGoogleComputerRequest(
        "gemini-2.5-computer-use-preview-10-2025",
        "do it",
        obs,
      ),
    );
    expect(body).toContain("computerUse");
    expect(body).toContain("AAAScreenshotBytes");
  });

  it("omits the image block when no screenshot was captured", () => {
    const body = JSON.stringify(
      buildOpenAiComputerRequest(
        "computer-use-preview",
        "do it",
        observation(),
      ),
    );
    expect(body).not.toContain("input_image");
  });
});
