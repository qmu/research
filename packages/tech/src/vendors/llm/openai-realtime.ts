import OpenAI from "openai";
import { OpenAIRealtimeWS } from "openai/realtime/ws";
import type { RealtimeClientEvent } from "openai/resources/realtime/realtime";
import type {
  CompletionClient,
  Completion,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";

// Wrap the OpenAI Realtime API (a bidirectional WebSocket, distinct from the
// chat-completions endpoint) behind the same provider-neutral CompletionClient
// port. The realtime session's audio modality is turned off — we drive it as a
// one-shot TEXT exchange so the same probes run over it — and the socket's event
// lifecycle stays entirely inside this adapter, so no realtime type leaks into
// the comparison logic. The exchange records time-to-first-token from the first
// text delta, which the streaming probe needs. Realtime has no reasoning-effort
// knob or JSON-schema mode, so effort is ignored and structured output falls back
// to a plain JSON-instructed exchange (its conformance is then graded like any
// other, never faked).

const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

const REALTIME_TIMEOUT_MS = 90_000;

// The normalized result of one realtime text exchange, including the streamed
// first-token time.
type Exchange = Readonly<{
  text: string;
  outputTokens: number;
  elapsedMs: number;
  ttftMs: number;
}>;

const runExchange = (
  client: OpenAI,
  apiModelId: string,
  prompt: string,
): Promise<Exchange> =>
  new Promise<Exchange>((resolve, reject) => {
    const startedAt = Date.now();
    const rt = new OpenAIRealtimeWS({ model: apiModelId }, client);
    let text = "";
    let ttftMs = 0;
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        rt.close();
      } catch {
        // best-effort close; the exchange is already resolved/rejected
      }
      fn();
    };

    const timer = setTimeout(
      () => finish(() => reject(new Error("realtime exchange timed out"))),
      REALTIME_TIMEOUT_MS,
    );

    rt.on("error", (event) =>
      finish(() => reject(new Error(String(event?.error?.message ?? event)))),
    );

    rt.on("session.created", () => {
      // Text-only: suppress the audio modality so we get a gradeable string.
      rt.send({
        type: "session.update",
        session: {
          type: "realtime",
          output_modalities: ["text"],
          instructions: SYSTEM_FINAL_ANSWER_ONLY,
        },
      } as RealtimeClientEvent);
      rt.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      } as RealtimeClientEvent);
      rt.send({ type: "response.create" } as RealtimeClientEvent);
    });

    rt.on("response.output_text.delta", (event) => {
      if (ttftMs === 0) {
        ttftMs = Date.now() - startedAt;
      }
      text += event.delta ?? "";
    });

    rt.on("response.done", (event) => {
      const outputTokens = event.response?.usage?.output_tokens ?? 0;
      finish(() =>
        resolve({
          text,
          outputTokens,
          elapsedMs: Date.now() - startedAt,
          ttftMs,
        }),
      );
    });
  });

export const createOpenAiRealtimeCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new OpenAI({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt): Promise<Completion> => {
      const ex = await runExchange(client, apiModelId, prompt);
      return {
        text: ex.text,
        outputTokens: ex.outputTokens,
        elapsedMs: ex.elapsedMs,
        model: apiModelId,
      };
    },
    completeStreaming: async (prompt): Promise<StreamedCompletion> => {
      const ex = await runExchange(client, apiModelId, prompt);
      return {
        text: ex.text,
        outputTokens: ex.outputTokens,
        elapsedMs: ex.elapsedMs,
        ttftMs: ex.ttftMs,
        model: apiModelId,
      };
    },
    completeStructured: async (prompt): Promise<StructuredCompletion> => {
      // No schema-enforcement surface on realtime; the schema prompt already asks
      // for conforming JSON, so return the raw text for the domain to grade.
      const ex = await runExchange(client, apiModelId, prompt);
      return {
        raw: ex.text,
        outputTokens: ex.outputTokens,
        elapsedMs: ex.elapsedMs,
        model: apiModelId,
      };
    },
  };
};
