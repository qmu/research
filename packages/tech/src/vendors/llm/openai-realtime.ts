import OpenAI from "openai";
import { OpenAIRealtimeWS } from "openai/realtime/ws";
import type { RealtimeClientEvent } from "openai/resources/realtime/realtime";
import type { CompletionClient, Completion } from "./types";

// Wrap the OpenAI Realtime API (a bidirectional WebSocket, distinct from the
// chat-completions endpoint) behind the same provider-neutral CompletionClient
// port. The realtime session's audio modality is turned off — we drive it as a
// one-shot TEXT exchange so the same probes (nested-JSON, length) run over it —
// and the socket's event lifecycle stays entirely inside this adapter, so no
// realtime type leaks into the comparison logic.

const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

const REALTIME_TIMEOUT_MS = 90_000;

export const createOpenAiRealtimeCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new OpenAI({ apiKey });
  return {
    model: apiModelId,
    complete: (prompt: string): Promise<Completion> =>
      new Promise<Completion>((resolve, reject) => {
        const startedAt = Date.now();
        const rt = new OpenAIRealtimeWS({ model: apiModelId }, client);
        let text = "";
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
          finish(() =>
            reject(new Error(String(event?.error?.message ?? event))),
          ),
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
          text += event.delta ?? "";
        });

        rt.on("response.done", (event) => {
          const outputTokens = event.response?.usage?.output_tokens ?? 0;
          finish(() =>
            resolve({
              text,
              outputTokens,
              elapsedMs: Date.now() - startedAt,
              model: apiModelId,
            }),
          );
        });
      }),
  };
};
