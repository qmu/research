import { describe, expect, it } from "vitest";
import {
  base64ByteLength,
  realtimeRoundTrip,
  type RealtimeProtocol,
} from "./realtime";

/** A minimal WebSocket stand-in: records sent frames and exposes the handlers
 * the driver assigns so a test can drive the exchange synchronously, no socket.
 * A factory (not a class — repo lint prefers functions and types over classes)
 * whose returned object is mutable so the driver can assign the `on*` handlers. */
type MockSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  binaryType: string;
  readonly sent: string[];
  closed: boolean;
  send: (data: string) => void;
  close: () => void;
  emit: (message: unknown) => void;
};

const createMockSocket = (): MockSocket => {
  const socket: MockSocket = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    binaryType: "blob",
    sent: [],
    closed: false,
    send: (data) => {
      socket.sent.push(data);
    },
    close: () => {
      socket.closed = true;
    },
    emit: (message) => {
      socket.onmessage?.({ data: JSON.stringify(message) });
    },
  };
  return socket;
};

const protocol = (
  overrides: Partial<RealtimeProtocol> = {},
): RealtimeProtocol => ({
  model: "test-realtime",
  url: "wss://example.test/realtime",
  protocols: [],
  headers: { Authorization: "Bearer k" },
  setupMessages: [{ setup: true }],
  isReady: (m) => (m as { ready?: unknown }).ready === true,
  turnMessages: [{ turn: 1 }],
  firstAudio: (m) => {
    const audio = (m as { audio?: unknown }).audio;
    return typeof audio === "string" ? audio : undefined;
  },
  serverError: (m) => {
    const error = (m as { error?: unknown }).error;
    return typeof error === "string" ? error : undefined;
  },
  ...overrides,
});

describe("base64ByteLength", () => {
  it("counts decoded bytes without padding", () => {
    expect(base64ByteLength(Buffer.from("hello").toString("base64"))).toBe(5);
    expect(base64ByteLength("")).toBe(0);
  });
});

describe("realtimeRoundTrip", () => {
  it("sends setup on open, the turn only after ready, and times first audio", async () => {
    const socket = createMockSocket();
    const promise = realtimeRoundTrip(
      protocol(),
      { overallMs: 1_000 },
      () => socket as unknown as WebSocket,
    );

    socket.onopen?.();
    expect(socket.sent).toEqual([JSON.stringify({ setup: true })]);

    // A pre-ready audio frame must be ignored (turn not committed yet).
    socket.emit({ audio: "AAAA" });
    expect(socket.sent).toHaveLength(1);

    socket.emit({ ready: true });
    expect(socket.sent).toEqual([
      JSON.stringify({ setup: true }),
      JSON.stringify({ turn: 1 }),
    ]);

    socket.emit({ audio: Buffer.from("pcm-bytes").toString("base64") });
    const result = await promise;
    expect(result.model).toBe("test-realtime");
    expect(result.firstAudioLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.firstAudioByteLength).toBe(9);
    expect(socket.closed).toBe(true);
  });

  it("rejects on a server error frame", async () => {
    const socket = createMockSocket();
    const promise = realtimeRoundTrip(
      protocol(),
      { overallMs: 1_000 },
      () => socket as unknown as WebSocket,
    );
    socket.onopen?.();
    socket.emit({ error: "quota exceeded" });
    await expect(promise).rejects.toThrow(/quota exceeded/);
    expect(socket.closed).toBe(true);
  });

  it("rejects when the socket closes before first audio", async () => {
    const socket = createMockSocket();
    const promise = realtimeRoundTrip(
      protocol(),
      { overallMs: 1_000 },
      () => socket as unknown as WebSocket,
    );
    socket.onopen?.();
    socket.onclose?.({ code: 1006, reason: "abnormal" });
    await expect(promise).rejects.toThrow(/closed before first audio/);
  });

  it("times out when no audio arrives", async () => {
    const socket = createMockSocket();
    const promise = realtimeRoundTrip(
      protocol(),
      { overallMs: 10 },
      () => socket as unknown as WebSocket,
    );
    socket.onopen?.();
    socket.emit({ ready: true });
    await expect(promise).rejects.toThrow(/timed out/);
  });
});
