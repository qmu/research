import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  Completion,
  CompletionClient,
  CompletionOptions,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";

// Anti-corruption layer for MLX (Apple's on-device inference framework). Unlike
// the cloud adapters in this directory, there is no SDK call to wrap: a trial
// runs `mlx_lm.generate --verbose` (or the equivalent `generate()` Python call)
// on the operator's own Apple Silicon machine. Most of this module's job is
// narrower than the other adapters' — parse that one fixed text format and
// normalize it into the same `StreamedCompletion` every provider produces — so
// the domain never branches on whether a trial ran in the cloud or on device.
// `createMlxCliCompletionClient` below is the exception: it actually runs the
// official CLI and measures a genuine timed trial — not a replay of a
// transcript someone captured by hand — and connects that measurement to this
// directory's shared `CompletionClient` port, the same contract
// `createAnthropicClient`/`createOpenAiCompatibleCompletionClient`/etc.
// implement — so any benchmark entrypoint written against that port reaches
// MLX exactly the way it reaches a cloud provider, with no provider branch.
//
// The format parsed here is `mlx_lm`'s own `--verbose` output: the generated
// text framed by a `==========` line on each side, followed by a fixed
// three-line stats block. This has been stable across `mlx_lm` releases.
const SEPARATOR_LINE = /^={3,}$/;

const PROMPT_STATS_RE =
  /^Prompt:\s*(\d+)\s*tokens,\s*([\d.]+)\s*tokens-per-sec$/;
const GENERATION_STATS_RE =
  /^Generation:\s*(\d+)\s*tokens,\s*([\d.]+)\s*tokens-per-sec$/;
const PEAK_MEMORY_RE = /^Peak memory:\s*([\d.]+)\s*GB$/;

export type MlxGenerateStats = Readonly<{
  promptTokens: number;
  promptTokensPerSecond: number;
  generationTokens: number;
  generationTokensPerSecond: number;
  peakMemoryGb: number;
}>;

const firstMatch = (
  lines: ReadonlyArray<string>,
  pattern: RegExp,
): RegExpMatchArray | undefined => {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match;
  }
  return undefined;
};

// Pure parse of the trailing stats block mlx_lm.generate prints after the
// closing `==========`. Exported and unit-tested on its own, separately from
// text extraction, so a stats-format regression and a framing regression fail
// with distinct messages.
export const parseMlxGenerateStats = (stdout: string): MlxGenerateStats => {
  const lines = stdout.split("\n").map((line) => line.trim());

  const promptMatch = firstMatch(lines, PROMPT_STATS_RE);
  const generationMatch = firstMatch(lines, GENERATION_STATS_RE);
  const peakMemoryMatch = firstMatch(lines, PEAK_MEMORY_RE);
  if (!promptMatch || !generationMatch || !peakMemoryMatch) {
    throw new Error(
      "mlx_lm.generate output is missing the Prompt/Generation/Peak memory stats block",
    );
  }
  return {
    promptTokens: Number(promptMatch[1]),
    promptTokensPerSecond: Number(promptMatch[2]),
    generationTokens: Number(generationMatch[1]),
    generationTokensPerSecond: Number(generationMatch[2]),
    peakMemoryGb: Number(peakMemoryMatch[1]),
  };
};

// The generated text sits between the FIRST and SECOND `==========` separator
// line; everything after the second separator is the stats block this module
// parses separately.
export const extractMlxGeneratedText = (stdout: string): string => {
  const lines = stdout.split("\n");
  const separatorIndexes: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (SEPARATOR_LINE.test(lines[index].trim())) {
      separatorIndexes.push(index);
    }
  }
  if (separatorIndexes.length < 2) {
    throw new Error(
      "mlx_lm.generate output is missing the `==========` framing around the generated text",
    );
  }
  const [firstIndex, secondIndex] = separatorIndexes;
  return lines
    .slice(firstIndex + 1, secondIndex)
    .join("\n")
    .trim();
};

// Normalize one captured `mlx_lm.generate --verbose` run into this repository's
// provider-neutral `StreamedCompletion` (see ADR 0009: throughput is end to
// end, over the whole request). `elapsedMs` is the prompt-processing time plus
// the generation time — the whole request, matching every other adapter.
// `ttftMs` is approximated by the prompt's own processing time: mlx_lm reports
// no separate first-token timestamp, and the time to process the prompt is the
// delay before generation — and so the first token — begins. `model` is not
// part of mlx_lm's stdout, so the caller supplies the id it ran, the same
// convention `createAnthropicClient`/`createOpenAiCompatibleCompletionClient`
// use for a model id their wire response does not carry.
export const normalizeMlxGenerateOutput = (
  stdout: string,
  model: string,
): StreamedCompletion => {
  const stats = parseMlxGenerateStats(stdout);
  const text = extractMlxGeneratedText(stdout);
  const ttftMs =
    stats.promptTokens === 0
      ? 0
      : (stats.promptTokens / stats.promptTokensPerSecond) * 1000;
  const generationMs =
    stats.generationTokens === 0
      ? 0
      : (stats.generationTokens / stats.generationTokensPerSecond) * 1000;
  return {
    text,
    outputTokens: stats.generationTokens,
    elapsedMs: ttftMs + generationMs,
    ttftMs,
    model,
  };
};

const execFileAsync = promisify(execFile);

// One invocation of the official CLI: the model path/id to load, the prompt to
// generate from, and the token budget. Kept provider-neutral at the call site —
// `createMlxCliCompletionClient` below is what maps a `CompletionOptions` onto
// this shape.
export type MlxGenerateInvocation = Readonly<{
  model: string;
  prompt: string;
  maxTokens: number;
}>;

// Runs one invocation and returns its captured stdout (the same text
// `normalizeMlxGenerateOutput` parses). A seam, not just a type: tests inject a
// fake that returns a fixture instead of shelling out, since the real CLI needs
// `mlx_lm` installed on Apple Silicon hardware this repository's CI does not
// have.
export type MlxGenerateRunner = (
  invocation: MlxGenerateInvocation,
) => Promise<string>;

// Pure argv builder, split out from the actual subprocess call below so the
// exact flags/order sent to the official CLI are unit-tested without needing
// `mlx_lm` installed anywhere. `--verbose` is required: without it, `mlx_lm`
// prints only the generated text, not the stats block this module parses.
export const buildMlxGenerateArgs = (
  invocation: MlxGenerateInvocation,
): string[] => [
  "--model",
  invocation.model,
  "--prompt",
  invocation.prompt,
  "--max-tokens",
  String(invocation.maxTokens),
  "--verbose",
];

// The real runner: shells out to the official `mlx_lm.generate` CLI exactly as
// an operator would from a terminal. No SDK and no server — `mlx_lm.generate`
// is a one-shot process, unlike `mlx_lm.server`'s OpenAI-compatible HTTP API —
// so this is the one adapter in this directory that measures a subprocess
// instead of a wire response.
export const runMlxGenerateCli: MlxGenerateRunner = async (invocation) => {
  const { stdout } = await execFileAsync(
    "mlx_lm.generate",
    buildMlxGenerateArgs(invocation),
  );
  return stdout;
};

export type MlxCliCompletionClientOptions = Readonly<{
  run?: MlxGenerateRunner;
}>;

// Connects the official CLI runner to this repository's shared
// `CompletionClient` port. `run` defaults to the real subprocess call; a test
// (or a keyless/dry-run caller) supplies a fixture-backed runner instead, the
// same seam `createFixtureClient` gives the cloud-provider adapters.
export const createMlxCliCompletionClient = (
  model: string,
  options?: MlxCliCompletionClientOptions,
): CompletionClient => {
  const run = options?.run ?? runMlxGenerateCli;

  const completeStreaming = async (
    prompt: string,
    completionOptions?: CompletionOptions,
  ): Promise<StreamedCompletion> => {
    const stdout = await run({
      model,
      prompt,
      maxTokens: completionOptions?.maxTokens ?? 1024,
    });
    return normalizeMlxGenerateOutput(stdout, model);
  };

  return {
    model,
    completeStreaming,
    // `mlx_lm.generate` has no separate non-streamed mode; one CLI call
    // measures both. `ttftMs` is dropped rather than carried into the plain
    // `Completion` contract, which has no such field.
    complete: async (
      prompt: string,
      completionOptions?: CompletionOptions,
    ): Promise<Completion> => {
      const streamed = await completeStreaming(prompt, completionOptions);
      return {
        text: streamed.text,
        outputTokens: streamed.outputTokens,
        elapsedMs: streamed.elapsedMs,
        model: streamed.model,
      };
    },
    // `mlx_lm.generate` prints free text; it has no JSON-schema-constrained
    // output mode to drive, so there is nothing to implement here. Throwing
    // (rather than, say, best-effort JSON-parsing the free text) matches
    // `CompletionOptions.effort`'s rule in types.ts: a capability a model/tool
    // does not support is a failed call, never silently approximated.
    completeStructured: async (): Promise<StructuredCompletion> => {
      throw new Error(
        "MLX CLI adapter has no structured-output mode: mlx_lm.generate " +
          "produces free text, not JSON-schema-constrained output",
      );
    },
  };
};
