import type { StatusSource } from "./sources";

// Keyless raw fetch of a provider's public status page. Returns the raw body for
// the LLM extractor to read; a non-2xx, timeout, or network error is captured as
// an honest failure (ok: false) rather than throwing — the caller records "not
// retrievable" instead of fabricating a status.
export type RawStatusFetch = Readonly<{
  ok: boolean;
  httpStatus: number | null;
  body: string;
  error: string | null;
}>;

export const fetchRawStatus = async (
  source: StatusSource,
  timeoutMs: number,
): Promise<RawStatusFetch> => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: source.kind === "html" ? "text/html" : "application/json",
        "user-agent": "qmu-research-availability/1.0 (+https://qmu.co.jp)",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        httpStatus: response.status,
        body: "",
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }
    return {
      ok: true,
      httpStatus: response.status,
      body: await response.text(),
      error: null,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      httpStatus: null,
      body: "",
      error: timedOut
        ? `fetch timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
};
