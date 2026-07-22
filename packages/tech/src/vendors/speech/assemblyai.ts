import type { AudioClip, SpeechToTextClient, Transcription } from "./types";

/**
 * AssemblyAI anti-corruption adapter for the speech-to-text port. Unlike the
 * bearer-key single-shot providers, AssemblyAI transcription is asynchronous:
 * upload the audio, submit a transcript job, then poll until it completes. No
 * persistent resource outlives the call (the upload is transient and scored in
 * memory), so it still fits the instrument's resource-free premise. The measured
 * latency legitimately includes poll wait — that is the honest end-to-end
 * transcription time for AssemblyAI's model. All AssemblyAI-specific facts (the
 * three endpoints, the `Authorization` bare-key scheme, the status machine,
 * punctuation flags) stay inside this ACL.
 */

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

/** Poll cadence and ceiling for the async job. Bounded so a stuck job fails the
 * call rather than hanging a run. */
const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_ATTEMPTS = 180;

/** Map a registry `apiModelId` to AssemblyAI's `speech_model` field. */
export const assemblyAiSpeechModel = (apiModelId: string): string => apiModelId;

/** Pure extractor for the upload response `{ upload_url }`. Total over
 * missing/malformed fields (returns undefined). */
export const extractAssemblyAiUploadUrl = (
  raw: unknown,
): string | undefined => {
  if (raw === null || typeof raw !== "object") return undefined;
  const url = (raw as { upload_url?: unknown }).upload_url;
  return typeof url === "string" && url.length > 0 ? url : undefined;
};

export type AssemblyAiState = Readonly<{
  /** Normalized job state: still running, done, or failed. */
  state: "pending" | "completed" | "error";
  text: string;
  error?: string;
}>;

/**
 * Pure normalizer for a transcript-job response. Maps AssemblyAI's
 * `queued`/`processing`/`completed`/`error` status onto a small state machine
 * the polling loop reads. Total over missing/malformed fields (unknown status is
 * treated as still pending). Exported so the state logic is unit-tested without
 * a network call.
 */
export const assemblyAiTranscriptState = (raw: unknown): AssemblyAiState => {
  if (raw === null || typeof raw !== "object") {
    return { state: "pending", text: "" };
  }
  const record = raw as { status?: unknown; text?: unknown; error?: unknown };
  const text = typeof record.text === "string" ? record.text : "";
  if (record.status === "completed") return { state: "completed", text };
  if (record.status === "error") {
    return {
      state: "error",
      text: "",
      error: typeof record.error === "string" ? record.error : "unknown error",
    };
  }
  return { state: "pending", text };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createAssemblyAiSpeechToTextClient = (
  apiModelId: string,
  apiKey: string,
): SpeechToTextClient => ({
  model: apiModelId,
  transcribe: async (audio: AudioClip): Promise<Transcription> => {
    const started = performance.now();

    const uploadResponse = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(audio.base64, "base64"),
    });
    if (!uploadResponse.ok) {
      throw new Error(
        `AssemblyAI upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`,
      );
    }
    const uploadUrl = extractAssemblyAiUploadUrl(await uploadResponse.json());
    if (uploadUrl === undefined) {
      throw new Error("AssemblyAI upload returned no upload_url");
    }

    const submitResponse = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speech_model: assemblyAiSpeechModel(apiModelId),
        punctuate: false,
        format_text: false,
      }),
    });
    if (!submitResponse.ok) {
      throw new Error(
        `AssemblyAI STT ${apiModelId} submit failed: ${submitResponse.status} ${await submitResponse.text()}`,
      );
    }
    const submitted = (await submitResponse.json()) as { id?: unknown };
    const jobId = typeof submitted.id === "string" ? submitted.id : undefined;
    if (jobId === undefined) {
      throw new Error("AssemblyAI submit returned no job id");
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const pollResponse = await fetch(
        `${ASSEMBLYAI_BASE}/transcript/${jobId}`,
        { headers: { Authorization: apiKey } },
      );
      if (!pollResponse.ok) {
        throw new Error(
          `AssemblyAI STT ${apiModelId} poll failed: ${pollResponse.status} ${await pollResponse.text()}`,
        );
      }
      const state = assemblyAiTranscriptState(await pollResponse.json());
      if (state.state === "completed") {
        return {
          text: state.text,
          elapsedMs: performance.now() - started,
          model: apiModelId,
        };
      }
      if (state.state === "error") {
        throw new Error(
          `AssemblyAI STT ${apiModelId} job error: ${state.error}`,
        );
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(
      `AssemblyAI STT ${apiModelId} did not complete within ${MAX_POLL_ATTEMPTS} polls`,
    );
  },
});
