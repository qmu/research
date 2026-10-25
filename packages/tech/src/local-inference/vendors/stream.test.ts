import { describe, expect, it } from "vitest";
import { observeStream, streamFailureReason } from "./stream.js";

const content = JSON.stringify({ choices: [{ delta: { content: "日本語" } }] });

function response(text: string, type: string, width: number) {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += width)
          controller.enqueue(bytes.slice(i, i + width));
        controller.close();
      },
    }),
    { headers: { "content-type": type } },
  );
}

describe("incremental TTFT stream parsing", () => {
  it.each([1, 2, 7, 4096])(
    "parses SSE JSON and UTF-8 split into %i-byte chunks",
    async (width) => {
      expect(
        await observeStream(
          response(
            `: log line\r\ndata: ${content}\r\n\r\ndata: [DONE]\r\n\r\n`,
            "text/event-stream",
            width,
          ),
          100,
          () => 125,
        ),
      ).toEqual({ firstMs: 25, lastMs: 25 });
    },
  );

  it.each([1, 3, 4096])(
    "parses JSON log lines split into %i-byte chunks",
    async (width) => {
      expect(
        await observeStream(
          response(
            `\r\n{"choices":[{"delta":{"role":"assistant","content":""}}]}\n${content}\r\n{"usage":{"completion_tokens":2}}\n[DONE]`,
            "application/x-ndjson; charset=utf-8",
            width,
          ),
          100,
          () => 125,
        ),
      ).toEqual({ firstMs: 25, lastMs: 25, completionTokens: 2 });
    },
  );

  it.each([
    ["{broken}\n", "INVALID-STREAM"],
    ["null\n", "INVALID-STREAM"],
    ['{"error":"private payload"}\n', "STREAM-ERROR"],
    ["", "INCOMPLETE-STREAM"],
    ['{"usage":{"completion_tokens":2}}', "INCOMPLETE-STREAM"],
  ])("uses a fixed reason after partial content: %s", async (tail, reason) => {
    const error = await observeStream(
      response(`${content}\n${tail}`, "application/jsonl", 1),
      100,
      () => 125,
    ).catch((error: unknown) => error);
    expect(streamFailureReason(error)).toBe(reason);
    expect(String(error)).not.toContain("private payload");
  });

  it("records first content before later log lines arrive", async () => {
    let clock = 125;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`${content}\n`));
        setTimeout(() => {
          clock = 200;
          controller.enqueue(new TextEncoder().encode(`${content}\n[DONE]\n`));
          controller.close();
        }, 20);
      },
    });
    expect(
      await observeStream(
        new Response(body, {
          headers: { "content-type": "application/x-ndjson" },
        }),
        100,
        () => clock,
      ),
    ).toEqual({ firstMs: 25, lastMs: 100 });
  });

  it("fails with a fixed reason once decoded output exceeds the budget", async () => {
    const frame = JSON.stringify({
      choices: [{ delta: { content: "secret-payload" } }],
    });
    const oversized =
      `data: ${frame}\r\n\r\n`.repeat(50) + "data: [DONE]\r\n\r\n";
    const error = await observeStream(
      response(oversized, "text/event-stream", 4096),
      100,
      () => 125,
      200,
    ).catch((error: unknown) => error);
    expect(streamFailureReason(error)).toBe("OUTPUT-BUDGET-EXCEEDED");
    expect(String(error)).not.toContain("secret-payload");
  });

  it("does not guess JSON log framing for SSE responses", async () => {
    const error = await observeStream(
      response(`${content}\n[DONE]\n`, "text/event-stream", 1),
      0,
    ).catch((error: unknown) => error);
    expect(streamFailureReason(error)).toBe("INCOMPLETE-STREAM");
  });
});
