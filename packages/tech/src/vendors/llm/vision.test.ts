import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_VISION_CAPABILITY,
  buildAnthropicVisionParams,
} from "./anthropic";
import {
  createFixtureVisionClient,
  FIXTURE_VISION_IMAGE,
  FIXTURE_VISION_INSTRUCTION,
} from "./fixture";
import type { JsonSchema, VisionClient, VisionInput } from "./types";

const fixtureVisionInput = {
  instruction: FIXTURE_VISION_INSTRUCTION,
  images: [FIXTURE_VISION_IMAGE],
} satisfies VisionInput;

describe("VisionClient port", () => {
  it("carries one instruction with ordered image/page inputs", () => {
    const input = {
      instruction: "Read each page in order.",
      images: [
        FIXTURE_VISION_IMAGE,
        {
          base64: "ZmFrZS1qcGVnLWJ5dGVz",
          mimeType: "image/jpeg",
          pageNumber: 2,
          label: "page-2",
        },
      ],
    } satisfies VisionInput;
    const client = createFixtureVisionClient() satisfies VisionClient;

    expect(client.capability.imageInput).toBe(true);
    expect(client.capability.supportedMimeTypes).toContain("image/png");
    expect(input.instruction).toBe("Read each page in order.");
    expect(input.images.map((image) => image.pageNumber)).toEqual([1, 2]);
  });
});

describe("Anthropic vision ACL", () => {
  it("builds one user message with image blocks and the paired instruction", () => {
    const body = buildAnthropicVisionParams(
      "claude-vision-test",
      fixtureVisionInput,
      { maxTokens: 123 },
      ANTHROPIC_VISION_CAPABILITY,
    );

    expect(body.model).toBe("claude-vision-test");
    expect(body.max_tokens).toBe(123);
    expect(body.messages).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: FIXTURE_VISION_IMAGE.base64,
            },
          },
          { type: "text", text: FIXTURE_VISION_INSTRUCTION },
        ],
      },
    ]);
  });

  it("adds Anthropic structured-output format behind the ACL", () => {
    const schema = {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    } satisfies JsonSchema;
    const body = buildAnthropicVisionParams(
      "claude-vision-test",
      fixtureVisionInput,
      undefined,
      ANTHROPIC_VISION_CAPABILITY,
      { type: "json_schema", schema },
    );

    expect(body.output_config).toEqual({
      format: { type: "json_schema", schema },
    });
  });

  it("rejects models that are not explicitly configured as vision-capable", () => {
    expect(() =>
      buildAnthropicVisionParams(
        "claude-text-only",
        fixtureVisionInput,
        undefined,
        undefined,
      ),
    ).toThrow("claude-text-only is not configured as vision-capable");
  });
});

describe("fixture vision client", () => {
  it("returns a byte-stable fixed response for the committed fixture image", async () => {
    const client = createFixtureVisionClient("fixture-vision");
    const first = await client.completeVision(fixtureVisionInput);
    const second = await client.completeVision(fixtureVisionInput);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.text).toBe(
      "Fixture vision response: one transparent 1x1 PNG page.",
    );
  });

  it("keeps structured vision fixture output deterministic", async () => {
    const client = createFixtureVisionClient("fixture-vision");
    const schema = {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    } satisfies JsonSchema;

    const first = await client.completeVisionStructured(
      fixtureVisionInput,
      schema,
    );
    const second = await client.completeVisionStructured(
      fixtureVisionInput,
      schema,
    );

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
