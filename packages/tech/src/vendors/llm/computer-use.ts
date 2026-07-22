import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type {
  AgentPolicy,
  ComputerUseTaskInput,
  HarnessCommand,
  HarnessObservation,
  PolicyAttempt,
} from "./types";

/**
 * Anti-corruption adapters for the three API-native computer-use tools, all
 * behind the single provider-neutral `AgentPolicy` seam. The fixed Playwright
 * harness (`src/computer-use/vendors/playwright-harness.ts`) owns the loop,
 * actuation, observation, and predicate-decided success; a provider supplies only
 * the think step — screenshot in, next action out.
 *
 * Each brain is memoryless per step by design: it is handed the task goal and the
 * CURRENT observation (screenshot + URL) and returns the single next action. The
 * fixture tasks are Markov-style (the next action is decided by the page in view),
 * so a per-step agent solves them without conversation threading — which keeps
 * each call a single typed request, the same bar as the other real clients here.
 * A stateful/threaded variant (feeding tool_result history) is a later refinement.
 *
 * Load-bearing logic is pure and unit-tested keyless: the request builders and the
 * response extractors (`extract*ComputerAction`) parse a provider payload shaped
 * like the SDK's into a neutral `RawComputerAction`, and `rawToHarnessCommand`
 * translates that into the harness vocabulary. Only the SDK request itself is
 * key-gated; per the repo convention, the topic's first real trial is the live
 * verification of this wiring, so a run needs nothing but keys and the owner
 * trigger. No paid call is made on any keyless path.
 */

const INSTRUCTION =
  "You are driving a web browser to complete a task. Look at the screenshot and " +
  "the current URL, then issue the single next computer action. When the task is " +
  "already complete, stop without taking another action.";

// ── Neutral action representation + translation ──────────────────────────────

/** The provider-neutral next action, normalized from each tool's own schema. */
export type RawComputerAction =
  | Readonly<{ type: "click"; x: number; y: number }>
  | Readonly<{ type: "type"; text: string }>
  | Readonly<{ type: "key"; key: string }>
  | Readonly<{ type: "scroll" }>
  | Readonly<{ type: "navigate"; url: string }>
  | Readonly<{ type: "wait" }>
  | Readonly<{ type: "finish" }>;

/** One think step's outcome, normalized: the next action plus the token usage the
 * domain scores. `finish` ends the harness loop. `unsupported` is set when the
 * provider DID emit a computer/tool call, but it is a stateful-protocol action the
 * memoryless v1 policy cannot drive (OpenAI's `screenshot`, Gemini's
 * `open_web_browser`): the extractor still maps `raw` to `finish`, but names the
 * untranslatable action so the policy can fail honestly instead of silently
 * scoring the subject 0% — which would misattribute an adapter limitation to the
 * model. A genuine stop (no computer call at all) leaves `unsupported` undefined. */
export type ProviderTurn = Readonly<{
  raw: RawComputerAction;
  inputTokens: number;
  outputTokens: number;
  unsupported?: string;
}>;

/** Translate a neutral raw action into the harness command vocabulary. Pure. */
export const rawToHarnessCommand = (raw: RawComputerAction): HarnessCommand => {
  if (raw.type === "click")
    return { kind: "click", point: { x: raw.x, y: raw.y } };
  if (raw.type === "type") return { kind: "type", text: raw.text };
  if (raw.type === "key") return { kind: "key", key: raw.key };
  if (raw.type === "scroll") return { kind: "scroll" };
  if (raw.type === "navigate") return { kind: "navigate", text: raw.url };
  if (raw.type === "wait") return { kind: "wait" };
  return { kind: "finish" };
};

// ── small guarded readers over an `unknown` payload ──────────────────────────

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

const numAt = (
  record: Record<string, unknown> | undefined,
  key: string,
): number => {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const strAt = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
};

const point = (
  value: unknown,
): Readonly<{ x: number; y: number }> | undefined => {
  if (Array.isArray(value) && value.length >= 2) {
    const [x, y] = value;
    if (typeof x === "number" && typeof y === "number") return { x, y };
  }
  const record = asRecord(value);
  if (record && typeof record.x === "number" && typeof record.y === "number") {
    return { x: record.x, y: record.y };
  }
  return undefined;
};

// A tool's action-type strings vary; normalize the click/type/key/scroll family
// used across the three providers into one neutral action. An unrecognized or
// terminal action (or none) reads as `finish`, so a subject that stops or emits
// something the harness cannot actuate ends the attempt honestly.
const normalizeAction = (
  actionType: string | undefined,
  fields: Readonly<{
    coordinate?: Readonly<{ x: number; y: number }>;
    text?: string;
    url?: string;
  }>,
): RawComputerAction => {
  const kind = (actionType ?? "").toLowerCase();
  if (kind.includes("click") && fields.coordinate) {
    return { type: "click", x: fields.coordinate.x, y: fields.coordinate.y };
  }
  if (kind === "type" && fields.text !== undefined) {
    return { type: "type", text: fields.text };
  }
  if ((kind === "key" || kind === "keypress") && fields.text !== undefined) {
    return { type: "key", key: fields.text };
  }
  if (kind === "scroll") return { type: "scroll" };
  if ((kind === "navigate" || kind === "goto") && fields.url !== undefined) {
    return { type: "navigate", url: fields.url };
  }
  if (kind === "wait") return { type: "wait" };
  return { type: "finish" };
};

// ── Anthropic (computer_20251124 on the Messages API beta) ───────────────────

export const buildAnthropicComputerRequest = (
  apiModelId: string,
  toolVersion: string,
  goal: string,
  observation: HarnessObservation,
): Record<string, unknown> => ({
  model: apiModelId,
  max_tokens: 1024,
  betas: ["computer-use-2025-11-24"],
  tools: [
    {
      type: toolVersion,
      name: "computer",
      display_width_px: observation.viewport.width,
      display_height_px: observation.viewport.height,
    },
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `${INSTRUCTION}\nTask: ${goal}\nCurrent URL: ${observation.url}`,
        },
        ...(observation.screenshotBase64 === undefined
          ? []
          : [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: observation.screenshotBase64,
                },
              },
            ]),
      ],
    },
  ],
});

/** Parse an Anthropic Messages response for the computer `tool_use` action and
 * usage. Pure and exported so it is unit-tested without a network call. */
export const extractAnthropicComputerAction = (
  response: unknown,
): ProviderTurn => {
  const record = asRecord(response);
  const usage = asRecord(record?.usage);
  const inputTokens = numAt(usage, "input_tokens");
  const outputTokens = numAt(usage, "output_tokens");
  const content = record?.content;
  let raw: RawComputerAction = { type: "finish" };
  if (Array.isArray(content)) {
    for (const block of content) {
      const blockRecord = asRecord(block);
      if (blockRecord?.type !== "tool_use") continue;
      const input = asRecord(blockRecord.input);
      raw = normalizeAction(strAt(input, "action"), {
        coordinate: point(input?.coordinate),
        text: strAt(input, "text"),
        url: strAt(input, "url"),
      });
      break;
    }
  }
  return { raw, inputTokens, outputTokens };
};

export const createAnthropicComputerUsePolicy = (
  apiModelId: string,
  apiKey: string,
  toolVersion: string,
): AgentPolicy => {
  const client = new Anthropic({ apiKey });
  // The bound-method cast confines the exact beta wire shape to this one line,
  // regardless of how the installed SDK types the overloaded `beta.messages.create`.
  const create = client.beta.messages.create.bind(
    client.beta.messages,
  ) as unknown as (body: Record<string, unknown>) => Promise<unknown>;
  return {
    model: apiModelId,
    begin: (task: ComputerUseTaskInput): PolicyAttempt => ({
      next: async (observation: HarnessObservation) => {
        const response = await create(
          buildAnthropicComputerRequest(
            apiModelId,
            toolVersion,
            task.goal,
            observation,
          ),
        );
        const turn = extractAnthropicComputerAction(response);
        return {
          command: rawToHarnessCommand(turn.raw),
          inputTokens: turn.inputTokens,
          outputTokens: turn.outputTokens,
          recovered: observation.lastError !== undefined,
        };
      },
    }),
  };
};

// ── OpenAI (computer_use_preview on the Responses API) ───────────────────────

export const buildOpenAiComputerRequest = (
  apiModelId: string,
  goal: string,
  observation: HarnessObservation,
): Record<string, unknown> => ({
  model: apiModelId,
  truncation: "auto",
  tools: [
    {
      type: "computer_use_preview",
      display_width: observation.viewport.width,
      display_height: observation.viewport.height,
      environment: "browser",
    },
  ],
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `${INSTRUCTION}\nTask: ${goal}\nCurrent URL: ${observation.url}`,
        },
        ...(observation.screenshotBase64 === undefined
          ? []
          : [
              {
                type: "input_image",
                image_url: `data:image/png;base64,${observation.screenshotBase64}`,
              },
            ]),
      ],
    },
  ],
});

/** Parse an OpenAI Responses payload for a `computer_call` action and usage.
 * Pure and exported so it is unit-tested without a network call. */
export const extractOpenAiComputerAction = (
  response: unknown,
): ProviderTurn => {
  const record = asRecord(response);
  const usage = asRecord(record?.usage);
  const inputTokens = numAt(usage, "input_tokens");
  const outputTokens = numAt(usage, "output_tokens");
  const output = record?.output;
  let raw: RawComputerAction = { type: "finish" };
  let unsupported: string | undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      const itemRecord = asRecord(item);
      if (itemRecord?.type !== "computer_call") continue;
      const action = asRecord(itemRecord.action);
      const actionType = strAt(action, "type");
      raw = normalizeAction(actionType, {
        coordinate: point(action),
        text: strAt(action, "text"),
        url: strAt(action, "url"),
      });
      // A `computer_call` was present but did not translate (the first action of
      // the Responses computer-use protocol is `screenshot`, which only advances
      // with threaded `computer_call_output` state the v1 policy does not keep).
      if (raw.type === "finish") unsupported = actionType ?? "computer_call";
      break;
    }
  }
  return {
    raw,
    inputTokens,
    outputTokens,
    ...(unsupported ? { unsupported } : {}),
  };
};

export const createOpenAiComputerUsePolicy = (
  apiModelId: string,
  apiKey: string,
): AgentPolicy => {
  const client = new OpenAI({ apiKey });
  const create = client.responses.create.bind(client.responses) as unknown as (
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  return {
    model: apiModelId,
    begin: (task: ComputerUseTaskInput): PolicyAttempt => ({
      next: async (observation: HarnessObservation) => {
        const response = await create(
          buildOpenAiComputerRequest(apiModelId, task.goal, observation),
        );
        const turn = extractOpenAiComputerAction(response);
        if (turn.unsupported !== undefined) {
          throw new Error(
            `OpenAI Responses computer-use is a stateful protocol (first action ` +
              `'${turn.unsupported}'); the memoryless v1 policy cannot drive it. ` +
              `A threaded loop (computer_call_output + previous_response_id) is a ` +
              `filed follow-up; this subject is recorded as not-measured, not 0%.`,
          );
        }
        return {
          command: rawToHarnessCommand(turn.raw),
          inputTokens: turn.inputTokens,
          outputTokens: turn.outputTokens,
          recovered: observation.lastError !== undefined,
        };
      },
    }),
  };
};

// ── Google (computer_use on the Gemini API) ──────────────────────────────────

export const buildGoogleComputerRequest = (
  apiModelId: string,
  goal: string,
  observation: HarnessObservation,
): Record<string, unknown> => ({
  model: apiModelId,
  contents: [
    {
      role: "user",
      parts: [
        {
          text: `${INSTRUCTION}\nTask: ${goal}\nCurrent URL: ${observation.url}`,
        },
        ...(observation.screenshotBase64 === undefined
          ? []
          : [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: observation.screenshotBase64,
                },
              },
            ]),
      ],
    },
  ],
  config: { tools: [{ computerUse: { environment: "ENVIRONMENT_BROWSER" } }] },
});

/** Parse a Gemini `generateContent` payload for the computer-use function call
 * and usage. Pure and exported so it is unit-tested without a network call. */
export const extractGoogleComputerAction = (
  response: unknown,
): ProviderTurn => {
  const record = asRecord(response);
  const usageMeta = asRecord(record?.usageMetadata);
  const inputTokens = numAt(usageMeta, "promptTokenCount");
  const outputTokens = numAt(usageMeta, "candidatesTokenCount");
  const candidates = record?.candidates;
  let raw: RawComputerAction = { type: "finish" };
  let unsupported: string | undefined;
  if (Array.isArray(candidates)) {
    const parts = asRecord(asRecord(candidates[0])?.content)?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const call = asRecord(asRecord(part)?.functionCall);
        if (call === undefined) continue;
        const args = asRecord(call.args);
        const actionName = strAt(args, "action") ?? strAt(call, "name");
        raw = normalizeAction(actionName, {
          coordinate: point(args?.coordinate),
          text: strAt(args, "text"),
          url: strAt(args, "url"),
        });
        // A `functionCall` was present but did not translate (the Gemini
        // computer-use protocol opens with `open_web_browser` and threads the
        // next screenshot back as a `functionResponse` — stateful history the v1
        // policy does not keep).
        if (raw.type === "finish") unsupported = actionName ?? "functionCall";
        break;
      }
    }
  }
  return {
    raw,
    inputTokens,
    outputTokens,
    ...(unsupported ? { unsupported } : {}),
  };
};

export const createGoogleComputerUsePolicy = (
  apiModelId: string,
  apiKey: string,
): AgentPolicy => {
  const client = new GoogleGenAI({ apiKey });
  const generate = client.models.generateContent.bind(
    client.models,
  ) as unknown as (body: Record<string, unknown>) => Promise<unknown>;
  return {
    model: apiModelId,
    begin: (task: ComputerUseTaskInput): PolicyAttempt => ({
      next: async (observation: HarnessObservation) => {
        const response = await generate(
          buildGoogleComputerRequest(apiModelId, task.goal, observation),
        );
        const turn = extractGoogleComputerAction(response);
        if (turn.unsupported !== undefined) {
          throw new Error(
            `Gemini computer-use is a stateful protocol (first call ` +
              `'${turn.unsupported}'); the memoryless v1 policy cannot drive it. ` +
              `A threaded loop (functionResponse history + coordinate scaling) is a ` +
              `filed follow-up; this subject is recorded as not-measured, not 0%.`,
          );
        }
        return {
          command: rawToHarnessCommand(turn.raw),
          inputTokens: turn.inputTokens,
          outputTokens: turn.outputTokens,
          recovered: observation.lastError !== undefined,
        };
      },
    }),
  };
};
