import { deflateSync } from "node:zlib";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { EdgeProbeResults } from "../../token-metering/domain/types";
import type { EdgeProbeRunner } from "../../token-metering/run";
import { PROBE_IMAGE_SIZE } from "../../token-metering/models";

/**
 * Edge-case probes that read only the unbilled count endpoints ($0):
 * - one tool definition's input-token overhead (Anthropic count_tokens),
 * - one pinned PNG's image-token conversion (Anthropic and Gemini).
 * The PNG is generated deterministically here (solid color, fixed size) so no
 * binary asset is committed and the probe is reproducible byte for byte.
 */

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  // Chunk layout: length(4) + type(4) + data + crc(4); crc covers type+data.
  const out = new Uint8Array(4 + body.length + 4);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(body, 4);
  new DataView(out.buffer).setUint32(4 + body.length, crc32(body));
  return out;
};

/** A solid mid-gray RGB PNG of `size`×`size` pixels. */
export const probePngBase64 = (size: number): string => {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const raw = new Uint8Array(size * (1 + size * 3));
  for (let row = 0; row < size; row += 1) {
    const offset = row * (1 + size * 3);
    raw[offset] = 0; // filter: none
    raw.fill(0x80, offset + 1, offset + 1 + size * 3);
  }
  const idat = new Uint8Array(deflateSync(raw));
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    total.set(part, offset);
    offset += part.length;
  }
  return Buffer.from(total).toString("base64");
};

const PROBE_TOOL = {
  name: "get_weather",
  description:
    "Get the current weather for a location. Returns temperature in celsius and a one-word condition.",
  input_schema: {
    type: "object" as const,
    properties: {
      location: { type: "string", description: "City name" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["location"],
  },
};

const PROBE_TEXT = "What is the weather in Tokyo?";

export const buildRealEdgeProbeRunner =
  (env: NodeJS.ProcessEnv): EdgeProbeRunner =>
  async (): Promise<EdgeProbeResults> => {
    const notes: string[] = [];
    const results: {
      anthropicToolOverheadTokens?: number;
      anthropicImageTokens?: number;
      googleImageTokens?: number;
    } = {};
    const imageBase64 = probePngBase64(PROBE_IMAGE_SIZE);

    const anthropicKey = env.ANTHROPIC_API_KEY;
    if (anthropicKey === undefined || anthropicKey === "") {
      notes.push("anthropic edge probes skipped: ANTHROPIC_API_KEY missing");
    } else {
      const client = new Anthropic({ apiKey: anthropicKey });
      const model = "claude-sonnet-5";
      try {
        const bare = await client.messages.countTokens({
          model,
          messages: [{ role: "user", content: PROBE_TEXT }],
        });
        const withTool = await client.messages.countTokens({
          model,
          messages: [{ role: "user", content: PROBE_TEXT }],
          tools: [PROBE_TOOL],
        });
        results.anthropicToolOverheadTokens =
          withTool.input_tokens - bare.input_tokens;
        const withImage = await client.messages.countTokens({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: imageBase64,
                  },
                },
                { type: "text", text: PROBE_TEXT },
              ],
            },
          ],
        });
        const withText = await client.messages.countTokens({
          model,
          messages: [{ role: "user", content: PROBE_TEXT }],
        });
        results.anthropicImageTokens =
          withImage.input_tokens - withText.input_tokens;
      } catch (error: unknown) {
        notes.push(`anthropic edge probe error: ${String(error)}`);
      }
    }

    const googleKey = env.GOOGLE_API_KEY;
    if (googleKey === undefined || googleKey === "") {
      notes.push("google edge probes skipped: GOOGLE_API_KEY missing");
    } else {
      const client = new GoogleGenAI({ apiKey: googleKey });
      const model = "gemini-3.1-pro-preview";
      try {
        const withImage = await client.models.countTokens({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/png", data: imageBase64 } },
                { text: PROBE_TEXT },
              ],
            },
          ],
        });
        const textOnly = await client.models.countTokens({
          model,
          contents: PROBE_TEXT,
        });
        if (
          typeof withImage.totalTokens === "number" &&
          typeof textOnly.totalTokens === "number"
        ) {
          results.googleImageTokens =
            withImage.totalTokens - textOnly.totalTokens;
        } else {
          notes.push("google image probe returned no totalTokens");
        }
      } catch (error: unknown) {
        notes.push(`google edge probe error: ${String(error)}`);
      }
    }

    return {
      ...results,
      imageWidth: PROBE_IMAGE_SIZE,
      imageHeight: PROBE_IMAGE_SIZE,
      ...(notes.length === 0 ? {} : { notes }),
    };
  };
