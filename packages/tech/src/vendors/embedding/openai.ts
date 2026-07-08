import OpenAI from "openai";
import type { EmbeddingClient, Vector } from "../../rag-benchmark/domain/types";

/**
 * Real fixed embedding for the self-managed stores' store-isolated comparison.
 * One model (`text-embedding-3-small`) embeds every document and query; the same
 * vectors are handed to sqlite-vec, S3 Vectors, and Vectorize, so differences
 * between those stores are the store's, not the embedding's. Managed stores
 * (OpenAI File Search, AutoRAG) embed internally and do not use this client.
 *
 * `dimensions` is requested explicitly (text-embedding-3-small supports Matryoshka
 * truncation) so every backend indexes the same width; 512 fits Vectorize's
 * [32,1536] range with margin.
 */
const MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 512;
const BATCH = 128;

export const createOpenAiEmbeddingClient = (
  dimensions: number = DEFAULT_DIMENSIONS,
): EmbeddingClient => {
  const client = new OpenAI();
  return {
    id: `${MODEL}@${dimensions}`,
    dimensions,
    embed: async (texts) => {
      const vectors: Array<Vector> = [];
      for (let start = 0; start < texts.length; start += BATCH) {
        const batch = texts.slice(start, start + BATCH);
        const response = await client.embeddings.create({
          model: MODEL,
          input: [...batch],
          dimensions,
        });
        for (const item of response.data) vectors.push(item.embedding);
      }
      return vectors;
    },
  };
};
