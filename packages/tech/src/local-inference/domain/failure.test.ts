import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  failureCodes,
  normalizeFailure,
  type FailureEngine,
  type FailureInput,
  type FailureCode,
} from "./failure.js";

const engines: FailureEngine[] = ["ollama", "llama.cpp", "mlx", "strata"];
const cases: [Omit<FailureInput, "engine">, FailureCode][] = [
  [
    { timedOut: true, error: new DOMException("abort", "AbortError") },
    "TIMEOUT",
  ],
  [{ error: { cause: { code: "ETIMEDOUT" } } }, "TIMEOUT"],
  [{ cancelled: true }, "CANCELLED"],
  [{ signal: "SIGINT" }, "CANCELLED"],
  [{ error: new DOMException("abort", "AbortError") }, "CANCELLED"],
  [
    { error: { error: "model requires more system memory than is available" } },
    "OUT-OF-MEMORY",
  ],
  [
    {
      stderr: "ggml_backend_cuda_buffer_type_alloc_buffer: failed to allocate",
    },
    "OUT-OF-MEMORY",
  ],
  [{ stderr: "RuntimeError: Metal: out of memory" }, "OUT-OF-MEMORY"],
  [{ stderr: "pack allocation: insufficient device memory" }, "OUT-OF-MEMORY"],
  [
    { httpStatus: 404, error: { error: 'model "test" not found' } },
    "MODEL-NOT-FOUND",
  ],
  [{ stderr: "RepositoryNotFoundError: model" }, "MODEL-NOT-FOUND"],
  [{ stderr: "error: unsupported model architecture" }, "NOT-LOADABLE"],
  [{ stderr: "SafetensorError: invalid header" }, "NOT-LOADABLE"],
  [{ stderr: "failed to load pack" }, "NOT-LOADABLE"],
  [{ httpStatus: 501 }, "UNSUPPORTED"],
  [{ stderr: "NotImplementedError" }, "UNSUPPORTED"],
  [
    {
      error: new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } }),
    },
    "UNREACHABLE",
  ],
  [{ error: { cause: { code: "ENOTFOUND" } } }, "UNREACHABLE"],
  [{ exitCode: 137, signal: "SIGKILL" }, "MEASURE-FAILED"],
  [{ httpStatus: 404 }, "MEASURE-FAILED"],
  [{ httpStatus: 503 }, "MEASURE-FAILED"],
  [{ exitCode: 1, stderr: "unrecognized diagnostic" }, "MEASURE-FAILED"],
  [{ error: new SyntaxError("Unexpected token") }, "MEASURE-FAILED"],
];

describe.each(engines)("%s failure normalization", (engine) => {
  it.each(cases)("classifies %j as %s", (input, code) => {
    expect(classifyFailure({ engine, ...input })).toBe(code);
  });

  it("serializes a fixed failed row without raw error, partial metrics or secrets", () => {
    const result = normalizeFailure({
      engine,
      exitCode: 1,
      stderr: "secret-stderr https://private-host/?token=secret",
      error: new Error("secret-message"),
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      engine,
      status: "failed",
      failure: { code: "MEASURE-FAILED" },
      reproduction: {
        fingerprintVersion: "failure-command/1",
        modelAlias: null,
        quantization: null,
        inputFixture: null,
        commandSha256: null,
      },
      metrics: {
        ttft: { value: null, unit: "s", reason: "MEASURE-FAILED" },
        completion_tokens: {
          value: null,
          unit: "tokens",
          reason: "MEASURE-FAILED",
        },
        tps: { value: null, unit: "tokens/s", reason: "MEASURE-FAILED" },
        startup_time: { value: null, unit: "s", reason: "NOT-RUN" },
        peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" },
      },
    });
  });
});

it("bounds cyclic causes and retains only an allowlisted code", () => {
  const error: { cause?: unknown } = {};
  error.cause = error;
  expect(failureCodes).toContain(
    normalizeFailure({ engine: "mlx", error }).failure.code,
  );
});

it("gives explicit deadline priority over cancellation and allocation diagnostics priority over load errors", () => {
  expect(
    classifyFailure({ engine: "mlx", timedOut: true, cancelled: true }),
  ).toBe("TIMEOUT");
  expect(
    classifyFailure({
      engine: "strata",
      stderr: "failed to load pack: out of memory",
    }),
  ).toBe("OUT-OF-MEMORY");
});
