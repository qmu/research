import type { EmbeddingClient, Vector } from "../../rag-benchmark/domain/types";

const DIMENSIONS = 64;

const tokenize = (text: string): ReadonlyArray<string> =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);

const hashToken = (token: string): number => {
  let hash = 2166136261;
  for (const char of token) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const normalize = (vector: ReadonlyArray<number>): Vector => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm === 0 ? vector : vector.map((value) => value / norm);
};

export const embedText = (text: string): Vector => {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  for (const token of tokenize(text)) {
    const hash = hashToken(token);
    const index = hash % DIMENSIONS;
    vector[index] += hash % 2 === 0 ? 1 : -1;
  }
  return normalize(vector);
};

export const createFixtureEmbeddingClient = (): EmbeddingClient => ({
  id: "fixed-hash-embedding-v1",
  dimensions: DIMENSIONS,
  embed: async (texts) => texts.map(embedText),
});
