import { describe, expect, it } from "vitest";
import {
  buildStrataChatBody,
  buildStrataLaunchArgs,
  captureStrataHostFingerprint,
  classifyStrataHostFingerprint,
  createStrataCompletionClient,
  createStrataFailure,
  isStrataFailure,
  normalizeStrataCompletion,
  strataBenchRecordFromChatResponse,
  type StrataChatResponse,
  type StrataHostFingerprint,
  type StrataHostInfoSource,
  type StrataHttpResponse,
  type StrataHttpTransport,
  type StrataLaunchInvocation,
  type StrataLauncher,
} from "./strata";

// ── host fingerprint ─────────────────────────────────────────────────────

const supportedHostInfo = (): StrataHostInfoSource => ({
  platform: () => "darwin",
  arch: () => "arm64",
  release: () => "24.6.0",
  cpus: () => [{ model: "Apple M4 Max" }, { model: "Apple M4 Max" }],
  totalmem: () => 128 * 1024 ** 3,
});

describe("captureStrataHostFingerprint", () => {
  it("reads platform/arch/release/cpu/memory from the injected source", () => {
    expect(captureStrataHostFingerprint(supportedHostInfo())).toEqual({
      platform: "darwin",
      arch: "arm64",
      osRelease: "24.6.0",
      cpuModel: "Apple M4 Max",
      cpuCount: 2,
      totalMemoryGb: 128,
    });
  });

  it("reports an unknown cpu model when the cpu list is empty", () => {
    const fingerprint = captureStrataHostFingerprint({
      platform: () => "linux",
      arch: () => "x64",
      release: () => "6.1.0",
      cpus: () => [],
      totalmem: () => 1024 ** 3,
    });
    expect(fingerprint.cpuModel).toBe("unknown");
    expect(fingerprint.cpuCount).toBe(0);
    expect(fingerprint.totalMemoryGb).toBe(1);
  });
});

describe("classifyStrataHostFingerprint", () => {
  it("flags an Intel Mac as an unsupported chip", () => {
    expect(
      classifyStrataHostFingerprint({
        platform: "darwin",
        arch: "x64",
        osRelease: "23.6.0",
        cpuModel: "Intel Core i9",
        cpuCount: 8,
        totalMemoryGb: 32,
      }),
    ).toBe("unsupported-chip");
  });

  it("flags a non-macOS host as an unsupported chip", () => {
    expect(
      classifyStrataHostFingerprint({
        platform: "linux",
        arch: "arm64",
        osRelease: "6.1.0",
        cpuModel: "generic arm64",
        cpuCount: 4,
        totalMemoryGb: 16,
      }),
    ).toBe("unsupported-chip");
  });

  it("flags Apple Silicon under macOS 15 (Darwin 24) as unsupported", () => {
    expect(
      classifyStrataHostFingerprint({
        platform: "darwin",
        arch: "arm64",
        osRelease: "23.6.0",
        cpuModel: "Apple M1",
        cpuCount: 8,
        totalMemoryGb: 16,
      }),
    ).toBe("unsupported-os-version");
  });

  it("clears Apple Silicon on macOS 15 or newer", () => {
    expect(
      classifyStrataHostFingerprint({
        platform: "darwin",
        arch: "arm64",
        osRelease: "24.0.0",
        cpuModel: "Apple M4",
        cpuCount: 10,
        totalMemoryGb: 64,
      }),
    ).toBeUndefined();
    expect(
      classifyStrataHostFingerprint({
        platform: "darwin",
        arch: "arm64",
        osRelease: "25.1.0",
        cpuModel: "Apple M5",
        cpuCount: 12,
        totalMemoryGb: 128,
      }),
    ).toBeUndefined();
  });
});

// ── structured failure ───────────────────────────────────────────────────

describe("createStrataFailure / isStrataFailure", () => {
  const fingerprint: StrataHostFingerprint = {
    platform: "darwin",
    arch: "arm64",
    osRelease: "24.0.0",
    cpuModel: "Apple M4",
    cpuCount: 10,
    totalMemoryGb: 64,
  };

  it("builds a plain Error carrying a reasonCode and fingerprint", () => {
    const failure = createStrataFailure("http-error", "boom", fingerprint);
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe("boom");
    expect(failure.reasonCode).toBe("http-error");
    expect(failure.fingerprint).toEqual(fingerprint);
  });

  it("is narrowed by isStrataFailure, unlike a plain Error", () => {
    const failure = createStrataFailure("cli-not-found", "x", fingerprint);
    expect(isStrataFailure(failure)).toBe(true);
    expect(isStrataFailure(new Error("plain"))).toBe(false);
    expect(isStrataFailure("not an error")).toBe(false);
  });
});

// ── pure CLI/body builders ───────────────────────────────────────────────

describe("buildStrataLaunchArgs", () => {
  it("builds the official CLI's launch flags in order", () => {
    expect(buildStrataLaunchArgs({ model: "Qwen3.8-Flash-Next" })).toEqual([
      "launch",
      "--model",
      "Qwen3.8-Flash-Next",
      "--yes",
      "--no-tui",
    ]);
  });
});

describe("buildStrataChatBody", () => {
  it("defaults max_tokens and carries the system + user messages", () => {
    const body = buildStrataChatBody(
      "Qwen3.8-Flash-Next",
      "capital of France?",
      undefined,
      false,
    );
    expect(body).toEqual({
      model: "Qwen3.8-Flash-Next",
      stream: false,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            "Respond with only the requested output. Do not include " +
            "preamble, explanation, or commentary.",
        },
        { role: "user", content: "capital of France?" },
      ],
    });
  });

  it("passes a requested maxTokens and the stream flag through", () => {
    const body = buildStrataChatBody("m", "p", { maxTokens: 64 }, true);
    expect(body.max_tokens).toBe(64);
    expect(body.stream).toBe(true);
  });
});

// ── strataBenchRecordFromChatResponse / normalizeStrataCompletion ───────────

describe("strataBenchRecordFromChatResponse", () => {
  it("wraps a chat-completions response as a dispatch-0 bench record", () => {
    const raw: StrataChatResponse = {
      choices: [{ message: { content: "Paris." }, finish_reason: "stop" }],
      usage: { completion_tokens: 3 },
    };
    expect(strataBenchRecordFromChatResponse(raw, 200, 3.4)).toEqual({
      final_answer: "Paris.",
      finish_reason: "stop",
      usage: { completion_tokens: 3 },
      error: null,
      http_status: 200,
      dispatch_offset_s: 0,
      end_offset_s: 3.4,
    });
  });
});

describe("normalizeStrataCompletion", () => {
  const validRecord = {
    final_answer: "Paris.",
    finish_reason: "stop" as const,
    usage: { completion_tokens: 3 },
    error: null,
    http_status: 200,
    dispatch_offset_s: 0,
    end_offset_s: 0.312,
  };

  it("imports a measured record into the common Completion", () => {
    expect(normalizeStrataCompletion(validRecord, "m")).toEqual({
      text: "Paris.",
      outputTokens: 3,
      elapsedMs: 312,
      model: "m",
    });
  });

  it("accepts a token-cap length finish, not only stop", () => {
    expect(
      normalizeStrataCompletion(
        { ...validRecord, finish_reason: "length" },
        "m",
      ).text,
    ).toBe("Paris.");
  });

  it("preserves a measured zero elapsed time and empty answer", () => {
    expect(
      normalizeStrataCompletion(
        {
          ...validRecord,
          final_answer: "",
          usage: { completion_tokens: 0 },
          end_offset_s: 0,
        },
        "m",
      ),
    ).toEqual({ text: "", outputTokens: 0, elapsedMs: 0, model: "m" });
  });

  it.each([
    { ...validRecord, http_status: 500 },
    { ...validRecord, error: { message: "upstream detail" } },
    { ...validRecord, finish_reason: "tool_calls" },
    { ...validRecord, finish_reason: null },
    { ...validRecord, final_answer: null },
    { ...validRecord, usage: { completion_tokens: -1 } },
    { ...validRecord, usage: { completion_tokens: "3" } },
    { ...validRecord, dispatch_offset_s: 5, end_offset_s: 4 },
    { ...validRecord, end_offset_s: Number.NaN },
  ])("rejects a malformed or unfinished record (%#)", (record) => {
    expect(() => normalizeStrataCompletion(record, "m")).toThrow(
      /Invalid Strata result/,
    );
  });

  it("requires non-blank model provenance", () => {
    expect(() => normalizeStrataCompletion(validRecord, "  ")).toThrow(
      /model provenance/,
    );
  });

  it("does not echo upstream error details", () => {
    expect(() =>
      normalizeStrataCompletion(
        { ...validRecord, error: { message: "sensitive-upstream-text" } },
        "m",
      ),
    ).toThrow(/^Invalid Strata result: failed or missing request status$/);
  });
});

// ── createStrataCompletionClient ────────────────────────────────────────

type Call = Readonly<{ url: string; body: string | undefined }>;

async function* linesFrom(
  dataLines: ReadonlyArray<string>,
): AsyncGenerator<string> {
  for (const line of dataLines) yield line;
}

const jsonResponse = (status: number, body: unknown): StrataHttpResponse => ({
  status,
  json: () => Promise.resolve(body),
  lines: () => linesFrom([]),
});

const streamResponse = (
  status: number,
  dataLines: ReadonlyArray<string>,
): StrataHttpResponse => ({
  status,
  json: () => Promise.resolve({}),
  lines: () => linesFrom(dataLines),
});

const scriptedTransport = (
  responder: (call: Call, callIndex: number) => StrataHttpResponse | Error,
): { transport: StrataHttpTransport; calls: Call[] } => {
  const calls: Call[] = [];
  const transport: StrataHttpTransport = (url, init) => {
    const call: Call = { url, body: init.body };
    calls.push(call);
    const result = responder(call, calls.length - 1);
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result);
  };
  return { transport, calls };
};

const recordingLauncher = (): {
  launch: StrataLauncher;
  invocations: StrataLaunchInvocation[];
} => {
  const invocations: StrataLaunchInvocation[] = [];
  const launch: StrataLauncher = (invocation) => {
    invocations.push(invocation);
    return Promise.resolve();
  };
  return { launch, invocations };
};

const failingLauncher =
  (error: Error): StrataLauncher =>
  () =>
    Promise.reject(error);

const stepClock = (incrementMs = 10) => {
  let t = 0;
  return () => {
    t += incrementMs;
    return t;
  };
};

const noopSleep = (): Promise<void> => Promise.resolve();

const CONNECTION_REFUSED = new Error(
  "fetch failed: connect ECONNREFUSED 127.0.0.1:8080",
);

describe("createStrataCompletionClient", () => {
  it("rejects on an unsupported host before launching or calling", async () => {
    const { transport, calls } = scriptedTransport(() => jsonResponse(200, {}));
    const { launch, invocations } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: {
        platform: () => "darwin",
        arch: () => "x64",
        release: () => "23.6.0",
        cpus: () => [{ model: "Intel Core i9" }],
        totalmem: () => 32 * 1024 ** 3,
      },
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.complete("prompt")).rejects.toMatchObject({
      reasonCode: "unsupported-chip",
    });
    expect(invocations).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("launches once, calls chat completions, normalizes", async () => {
    const { transport, calls } = scriptedTransport(() =>
      jsonResponse(200, {
        choices: [{ message: { content: "Paris." }, finish_reason: "stop" }],
        usage: { completion_tokens: 3 },
      }),
    );
    const { launch, invocations } = recordingLauncher();
    const client = createStrataCompletionClient("Qwen3.8-Flash-Next", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    const result = await client.complete("capital of France?");

    expect(invocations).toEqual([{ model: "Qwen3.8-Flash-Next" }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:8080/v1/chat/completions");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toMatchObject({
      model: "Qwen3.8-Flash-Next",
      stream: false,
    });
    expect(result).toEqual({
      text: "Paris.",
      outputTokens: 3,
      elapsedMs: 10,
      model: "Qwen3.8-Flash-Next",
    });
  });

  it("launches only once across repeated calls", async () => {
    const { transport } = scriptedTransport(() =>
      jsonResponse(200, {
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
        usage: { completion_tokens: 1 },
      }),
    );
    const { launch, invocations } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await client.complete("one");
    await client.complete("two");

    expect(invocations).toHaveLength(1);
  });

  it("reports cli-not-found when the launcher itself fails", async () => {
    const { transport } = scriptedTransport(() => jsonResponse(200, {}));
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch: failingLauncher(new Error("spawn strata ENOENT")),
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.complete("prompt")).rejects.toMatchObject({
      reasonCode: "cli-not-found",
    });
  });

  it("retries connection-refused until the server comes up", async () => {
    let attempts = 0;
    const { transport } = scriptedTransport(() => {
      attempts += 1;
      if (attempts < 3) return CONNECTION_REFUSED;
      return jsonResponse(200, {
        choices: [{ message: { content: "ready" }, finish_reason: "stop" }],
        usage: { completion_tokens: 1 },
      });
    });
    const { launch } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      launchTimeoutMs: 10_000,
      clock: stepClock(),
      sleep: noopSleep,
    });

    const result = await client.complete("prompt");
    expect(attempts).toBe(3);
    expect(result.text).toBe("ready");
  });

  it("reports launch-timeout once the deadline passes", async () => {
    const { transport } = scriptedTransport(() => CONNECTION_REFUSED);
    const { launch } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      launchTimeoutMs: 0,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.complete("prompt")).rejects.toMatchObject({
      reasonCode: "launch-timeout",
    });
  });

  it("reports http-error on a non-2xx response, unretried", async () => {
    const { transport, calls } = scriptedTransport(() => jsonResponse(500, {}));
    const { launch } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.complete("prompt")).rejects.toMatchObject({
      reasonCode: "http-error",
    });
    expect(calls).toHaveLength(1);
  });

  it("propagates a tool-call response as a plain Error", async () => {
    const { transport } = scriptedTransport(() =>
      jsonResponse(200, {
        choices: [{ message: { content: "" }, finish_reason: "tool_calls" }],
        usage: { completion_tokens: 0 },
      }),
    );
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch: recordingLauncher().launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.complete("prompt")).rejects.toThrow(
      /Invalid Strata result/,
    );
    try {
      await client.complete("prompt");
      throw new Error("expected a throw");
    } catch (error) {
      expect(isStrataFailure(error)).toBe(false);
    }
  });

  it("completeStreaming concatenates deltas and reports ttft", async () => {
    const { transport } = scriptedTransport(() =>
      streamResponse(200, [
        JSON.stringify({ choices: [{ delta: { content: "Pa" } }] }),
        JSON.stringify({ choices: [{ delta: { content: "ris." } }] }),
        JSON.stringify({ usage: { completion_tokens: 2 } }),
        "[DONE]",
      ]),
    );
    const { launch } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    const result = await client.completeStreaming("prompt");
    expect(result.text).toBe("Paris.");
    expect(result.outputTokens).toBe(2);
    expect(result.ttftMs).not.toBeNull();
    expect(result.model).toBe("m");
  });

  it("completeStreaming rejects a mid-stream tool call", async () => {
    const { transport } = scriptedTransport(() =>
      streamResponse(200, [
        JSON.stringify({
          choices: [{ delta: { tool_calls: [{ name: "x" }] } }],
        }),
        "[DONE]",
      ]),
    );
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch: recordingLauncher().launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.completeStreaming("prompt")).rejects.toMatchObject({
      reasonCode: "tool-call-unsupported",
    });
  });

  it("completeStreaming rejects an empty stream as incomplete", async () => {
    const { transport } = scriptedTransport(() =>
      streamResponse(200, ["[DONE]"]),
    );
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch: recordingLauncher().launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(client.completeStreaming("prompt")).rejects.toMatchObject({
      reasonCode: "incomplete-response",
    });
  });

  it("completeStructured rejects without launching or calling", async () => {
    const { transport, calls } = scriptedTransport(() => jsonResponse(200, {}));
    const { launch, invocations } = recordingLauncher();
    const client = createStrataCompletionClient("m", {
      hostInfo: supportedHostInfo(),
      launch,
      transport,
      clock: stepClock(),
      sleep: noopSleep,
    });

    await expect(
      client.completeStructured("prompt", { type: "object" }),
    ).rejects.toThrow(/structured-output/);
    expect(invocations).toEqual([]);
    expect(calls).toEqual([]);
  });
});
