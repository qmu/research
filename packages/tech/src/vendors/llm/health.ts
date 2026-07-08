import type { EffortLevel } from "../../llm-model-comparison/domain/effort";
import {
  AVAILABILITY_HEALTH_PROMPT,
  type AvailabilityFailureType,
  type AvailabilitySample,
  type AvailabilitySamplingSpec,
} from "../../llm-model-comparison/domain/availability";
import type { Provider } from "../../llm-model-comparison/domain/types";
import type { CompletionClient } from "./types";

export type HealthProbeTarget = Readonly<{
  provider: Provider;
  targetModelId: string;
  targetModelName: string;
  effort: EffortLevel;
  client: CompletionClient;
}>;

export const classifyHealthProbeError = (
  error: unknown,
): AvailabilityFailureType => {
  if (error instanceof Error && error.message.includes("timed out after")) {
    return "timeout";
  }
  const record = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  const status =
    typeof record.status === "number"
      ? record.status
      : typeof record.statusCode === "number"
        ? record.statusCode
        : undefined;
  const text = String(error).toLowerCase();
  if (status === 429 || text.includes("429") || text.includes("rate limit")) {
    return "rate_limit";
  }
  if (status !== undefined && status >= 500 && status <= 599) {
    return "server_error";
  }
  if (
    text.includes("econnreset") ||
    text.includes("enotfound") ||
    text.includes("network") ||
    text.includes("socket")
  ) {
    return "network_error";
  }
  if (status !== undefined && status >= 400 && status <= 499) {
    return "client_error";
  }
  return "unknown_error";
};

const withTimeout = <T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([work, guard]).finally(() => clearTimeout(timer));
};

export const probeLlmHealth = async (
  target: HealthProbeTarget,
  spec: AvailabilitySamplingSpec,
  observedAt = new Date().toISOString(),
): Promise<AvailabilitySample> => {
  const startedAt = Date.now();
  try {
    const completion = await withTimeout(
      target.client.complete(AVAILABILITY_HEALTH_PROMPT, {
        maxTokens: 4,
        effort: target.effort,
      }),
      spec.timeoutMs,
      `${target.provider}/${target.targetModelId} health probe`,
    );
    return {
      provider: target.provider,
      targetModelId: target.targetModelId,
      targetModelName: target.targetModelName,
      observedAt,
      ok: true,
      responseTimeMs: completion.elapsedMs,
      failureType: null,
    };
  } catch (error: unknown) {
    return {
      provider: target.provider,
      targetModelId: target.targetModelId,
      targetModelName: target.targetModelName,
      observedAt,
      ok: false,
      responseTimeMs: Date.now() - startedAt,
      failureType: classifyHealthProbeError(error),
    };
  }
};
