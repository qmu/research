/**
 * Pull bare source URLs out of a model's answer text. The grounded providers
 * that expose structured citations (e.g. Perplexity Sonar) return them through
 * the vendor port; providers reached over a plain completion (the ungrounded
 * controls, and any grounded surface not yet wired) only have URLs inline in the
 * prose, so the runner falls back to this. Pure and total: no URL yields an empty
 * list, and citation-validity then scores 0.
 */
export const extractUrls = (text: string): ReadonlyArray<string> => {
  const matches = text.match(/https?:\/\/[^\s)\]}"'<>]+/gi);
  if (matches === null) return [];
  const cleaned = matches.map((url) => url.replace(/[.,;:]+$/, ""));
  return [...new Set(cleaned)];
};
