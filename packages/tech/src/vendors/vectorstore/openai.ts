import OpenAI, { toFile } from "openai";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  VectorStore,
} from "../../rag-benchmark/domain/types";

/**
 * Anti-corruption layer for OpenAI's managed vector store (File Search).
 * The provider embeds and chunks documents internally, so this store ignores
 * the fixed-embedding vectors and searches by query text — its measurements
 * cover the whole managed stack, never the store in isolation.
 *
 * Every created resource is deleted in close(); a one-day expiry policy on the
 * vector store is the safety net if cleanup is interrupted.
 */
export const createOpenAiVectorStore = (): VectorStore => {
  const client = new OpenAI();
  let vectorStoreId: string | null = null;
  const documentIdByFileId = new Map<string, string>();

  return {
    id: "openai-vector-store",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      const store = await client.vectorStores.create({
        name: "rag-benchmark",
        expires_after: { anchor: "last_active_at", days: 1 },
      });
      vectorStoreId = store.id;
      for (const { document } of documents) {
        const file = await client.vectorStores.files.uploadAndPoll(
          store.id,
          await toFile(
            Buffer.from(`${document.title}\n${document.text}`, "utf8"),
            `${document.id}.txt`,
          ),
        );
        documentIdByFileId.set(file.id, document.id);
      }
    },
    query: async (
      query: StoreQuery,
      k: number,
    ): Promise<ReadonlyArray<QueryResult>> => {
      if (vectorStoreId === null) return [];
      const page = await client.vectorStores.search(vectorStoreId, {
        query: query.text,
        max_num_results: k,
      });
      return page.data.map((result) => ({
        documentId: documentIdByFileId.get(result.file_id) ?? result.file_id,
        score: result.score,
      }));
    },
    close: async () => {
      // Best-effort cleanup: a failed delete must not turn a measured run into
      // an error; the expiry policy set at creation reclaims stragglers.
      if (vectorStoreId !== null) {
        await client.vectorStores.delete(vectorStoreId).catch(() => undefined);
      }
      for (const fileId of documentIdByFileId.keys()) {
        await client.files.delete(fileId).catch(() => undefined);
      }
    },
  };
};
