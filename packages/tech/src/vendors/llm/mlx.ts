import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  CompletionClient,
  CompletionOptions,
  StreamedCompletion,
} from "./types";

// Anti-corruption layer for MLX (Apple's on-device inference framework). Unlike
// the cloud adapters in this directory, there is no SDK call to wrap: a trial
// runs `mlx_lm.generate --verbose` (or the equivalent `generate()` Python call)
// on the operator's own Apple Silicon machine, and only the CAPTURED stdout
// comes back to this repository. This module's job is narrower than the other
// adapters' — parse that one fixed text format and normalize it into the same
// `StreamedCompletion` every provider produces — so the domain never branches on
// whether a trial ran in the cloud or on device.
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
  return lines.slice(firstIndex + 1, secondIndex).join("\n").trim();
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

// ── Connecting to the shared benchmark runner ────────────────────────────────
// Every cloud adapter in this directory reaches a live SDK/HTTP endpoint and is
// usable directly as the `CompletionClient` the shared benchmark runner
// (`llm-model-comparison/run.ts`'s `buildConfigRun`/`runTrial`) depends on. Until
// now `normalizeMlxGenerateOutput` was only ever called directly from a test —
// nothing produced the stdout it normalizes, so MLX had no way to reach that
// port. `mlx_lm.generate --verbose` IS a live, local invocation on the
// operator's own Apple Silicon machine, so it is wrapped the same way the
// OpenAI-compatible adapters wrap `fetch`: launch the process, capture its
// stdout, and normalize it with `normalizeMlxGenerateOutput` above. The process
// launch is injected as `runGenerate` so a trial's HTTP-free, subprocess-free
// unit test can supply fixed fixture stdout, or a rejection, with no Apple
// Silicon hardware or `mlx_lm` install required. Registering an MLX `ModelCard`
// in that runner's provider catalog — which today assumes an API-key credential
// per provider — is a separate change; this is the client the catalog entry
// would construct.
export type MlxGenerateRequest = Readonly<{
  model: string;
  prompt: string;
  maxTokens: number;
}>;

export type MlxGenerateRunner = (request: MlxGenerateRequest) => Promise<string>;

const execFileAsync = promisify(execFile);

// The real runner: shells out to the `mlx_lm.generate` console script installed
// by `pip install mlx-lm`. Not unit-tested itself (there is no `mlx_lm` install in
// CI) — `createMlxCompletionClient`'s tests inject a fixture or failing runner in
// its place instead, the same split `parseMlxGenerateStats` keeps from framing.
export const runMlxGenerate: MlxGenerateRunner = async ({
  model,
  prompt,
  maxTokens,
}) => {
  const { stdout } = await execFileAsync("mlx_lm.generate", [
    "--model",
    model,
    "--prompt",
    prompt,
    "--max-tokens",
    String(maxTokens),
    "--verbose",
  ]);
  return stdout;
};

// Falls back to a generation window wide enough for a meaningful trial when the
// caller states no `maxTokens`; override it per call for a real benchmark run.
const DEFAULT_MAX_TOKENS = 512;

// Wrap the MLX CLI behind the domain-named `CompletionClient` port every other
// provider implements, so the shared benchmark runner drives an on-device MLX
// trial exactly like it drives Anthropic/OpenAI/etc — same prompt in, same
// `Completion`/`StreamedCompletion` shape out. `mlx_lm.generate` has no
// structured-output / JSON-schema feature, so `completeStructured` is surfaced
// as a failed call rather than faking conformance — the same rule this
// repository applies to a model asked for an effort level it does not support
// (see `CompletionOptions`): an unsupported capability is a failure the caller
// can see, never a silently wrong result.
export const createMlxCompletionClient = (
  model: string,
  runGenerate: MlxGenerateRunner = runMlxGenerate,
): CompletionClient => {
  const runAndNormalize = async (
    prompt: string,
    options: CompletionOptions | undefined,
  ): Promise<StreamedCompletion> => {
    const stdout = await runGenerate({
      model,
      prompt,
      maxTokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    });
    return normalizeMlxGenerateOutput(stdout, model);
  };
  return {
    model,
    complete: async (prompt, options) => {
      const { text, outputTokens, elapsedMs } = await runAndNormalize(
        prompt,
        options,
      );
      return { text, outputTokens, elapsedMs, model };
    },
    completeStreaming: (prompt, options) => runAndNormalize(prompt, options),
    completeStructured: async () => {
      throw new Error(
        "mlx_lm.generate has no structured-output feature; " +
          "completeStructured is not supported by the MLX CLI adapter",
      );
    },
  };
};
