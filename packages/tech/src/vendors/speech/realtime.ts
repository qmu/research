import type { SpeechToSpeechClient, SpeechToSpeechRoundTrip } from "./types";

/**
 * A provider-neutral realtime (WebSocket duplex) protocol description and a thin
 * driver that measures one speech-to-speech round-trip: the wall-clock latency
 * from committing a short input turn to the first audio-output chunk.
 *
 * All provider-specific *logic* — the endpoint, the auth, the setup and turn
 * message shapes, and how to recognize the session-ready signal, the first audio
 * chunk, and a server error — lives in a pure `RealtimeProtocol` (unit-tested
 * against recorded message shapes, no socket). The driver below is the only
 * impure part: it owns the WebSocket, the two timeouts, and the clock, and turns
 * a protocol into a `SpeechToSpeechClient`. This is the same split the REST
 * speech adapters use (pure URL builders / response extractors + a thin fetch).
 */

/** Base64 → decoded byte length, without materializing the bytes. */
export const base64ByteLength = (base64: string): number =>
  Math.floor((base64.replace(/=+$/, "").length * 3) / 4);

export type RealtimeProtocol = Readonly<{
  model: string;
  /** The `wss://` endpoint to open (may embed a query-string API key). */
  url: string;
  /** WebSocket subprotocols, or `[]` when none are used. */
  protocols: ReadonlyArray<string>;
  /** Extra request headers (e.g. bearer auth), or `{}` when none. */
  headers: Readonly<Record<string, string>>;
  /** Messages sent as soon as the socket opens, before the input turn. */
  setupMessages: ReadonlyArray<unknown>;
  /** True when a parsed server message signals the session is ready for input
   * (OpenAI `session.created`; Gemini `setupComplete`). */
  isReady: (message: unknown) => boolean;
  /** Messages that commit one short input turn and request an audio response —
   * already bound to the prompt by the protocol builder. */
  turnMessages: ReadonlyArray<unknown>;
  /** The base64 audio of the first audio-output chunk this message carries, or
   * `undefined` if it carries none. */
  firstAudio: (message: unknown) => string | undefined;
  /** A server-reported error string for this message, or `undefined`. */
  serverError: (message: unknown) => string | undefined;
}>;

export type RealtimeTimeouts = Readonly<{
  /** Cap on the whole exchange (open → ready → first audio), in ms. */
  overallMs: number;
}>;

const DEFAULT_TIMEOUTS: RealtimeTimeouts = { overallMs: 20_000 };

/** undici's `WebSocket` accepts an init object with request `headers` and
 * `protocols`, but `@types/node` only types the WHATWG `string | string[]`
 * second argument. Cast the constructor once to the shape undici implements. */
type UndiciWebSocketInit = Readonly<{
  protocols?: ReadonlyArray<string>;
  headers?: Readonly<Record<string, string>>;
}>;
const UndiciWebSocket = WebSocket as unknown as new (
  url: string,
  init?: UndiciWebSocketInit,
) => WebSocket;

/** Parse a WebSocket text frame to JSON; `undefined` for non-text/non-JSON. */
const parseFrame = (data: unknown): unknown => {
  const text =
    typeof data === "string"
      ? data
      : data instanceof ArrayBuffer
        ? Buffer.from(data).toString("utf8")
        : ArrayBuffer.isView(data)
          ? Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
              "utf8",
            )
          : undefined;
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * Drive one realtime round-trip over a real WebSocket. Resolves with the
 * first-audio latency (measured from the moment the input turn is committed, so
 * setup/handshake time is excluded) or rejects with a clear reason, always
 * closing the socket. Injecting `createSocket` keeps the pure protocol testable
 * and lets the caller stay off the network in tests.
 */
export const realtimeRoundTrip = (
  protocol: RealtimeProtocol,
  timeouts: RealtimeTimeouts = DEFAULT_TIMEOUTS,
  createSocket: (
    url: string,
    protocols: ReadonlyArray<string>,
    headers: Readonly<Record<string, string>>,
  ) => WebSocket = (url, protocols, headers) =>
    new UndiciWebSocket(
      url,
      protocols.length > 0 ? { protocols, headers } : { headers },
    ),
): Promise<SpeechToSpeechRoundTrip> =>
  new Promise<SpeechToSpeechRoundTrip>((resolve, reject) => {
    const socket = createSocket(
      protocol.url,
      protocol.protocols,
      protocol.headers,
    );
    // undici delivers binary frames as a Blob by default; Gemini Live sends its
    // control/audio frames binary, so without this they would arrive as Blobs
    // that `parseFrame` cannot read and the session would silently never become
    // ready. arraybuffer frames are what `parseFrame` decodes.
    try {
      socket.binaryType = "arraybuffer";
    } catch {
      /* a mock socket may not implement the setter */
    }
    let committedAt: number | undefined;
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* already closing */
      }
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `realtime round-trip for ${protocol.model} timed out after ${timeouts.overallMs} ms ` +
              `(${committedAt === undefined ? "never reached session-ready" : "no audio after input commit"}).`,
          ),
        ),
      );
    }, timeouts.overallMs);

    const send = (message: unknown): void =>
      socket.send(JSON.stringify(message));

    socket.onopen = (): void => {
      for (const message of protocol.setupMessages) send(message);
    };

    socket.onmessage = (event: MessageEvent): void => {
      const message = parseFrame(event.data);
      if (message === undefined) return;

      const error = protocol.serverError(message);
      if (error !== undefined) {
        finish(() =>
          reject(new Error(`${protocol.model} realtime error: ${error}`)),
        );
        return;
      }

      if (committedAt === undefined) {
        if (protocol.isReady(message)) {
          committedAt = performance.now();
          for (const turn of protocol.turnMessages) send(turn);
        }
        return;
      }

      const audio = protocol.firstAudio(message);
      if (audio !== undefined) {
        const firstAudioLatencyMs = performance.now() - committedAt;
        finish(() =>
          resolve({
            firstAudioLatencyMs,
            firstAudioByteLength: base64ByteLength(audio),
            model: protocol.model,
          }),
        );
      }
    };

    socket.onerror = (): void => {
      finish(() =>
        reject(new Error(`${protocol.model} realtime socket error.`)),
      );
    };

    socket.onclose = (event: CloseEvent): void => {
      finish(() =>
        reject(
          new Error(
            `${protocol.model} realtime socket closed before first audio ` +
              `(code ${event.code}${event.reason ? `: ${event.reason}` : ""}).`,
          ),
        ),
      );
    };
  });

/** Turn a pure `RealtimeProtocol` builder into the neutral speech-to-speech
 * port; the builder binds the prompt into the protocol's `turnMessages`. */
export const realtimeClientFrom = (
  model: string,
  protocolFor: (prompt: string) => RealtimeProtocol,
  timeouts?: RealtimeTimeouts,
): SpeechToSpeechClient => ({
  model,
  roundTrip: (prompt): Promise<SpeechToSpeechRoundTrip> =>
    realtimeRoundTrip(protocolFor(prompt), timeouts),
});
