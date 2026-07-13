import OpenAI, { toFile } from "openai";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  VectorStore,
} from "../../rag-benchmark/domain/types";
import { warnTeardownFailure } from "./teardown";

/**
 * Anti-corruption layer for OpenAI's managed vector store (File Search).
 * The provider embeds and chunks documents internally, so this store ignores
 * the fixed-embedding vectors and searches by query text — its measurements
 * cover the whole managed stack, never the store in isolation.
 *
 * Every created resource is deleted in close(); a one-day expiry policy on the
 * vector store is the safety net if cleanup is interrupted.
 */
const documentIdFromFilename = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "");

export const createOpenAiVectorStore = (): VectorStore => {
  const client = new OpenAI();
  let vectorStoreId: string | null = null;
  const fileIds: Array<string> = [];

  return {
    id: "openai-vector-store",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      const store = await client.vectorStores.create({
        name: "rag-benchmark",
        expires_after: { anchor: "last_active_at", days: 1 },
      });
      vectorStoreId = store.id;
      // Batch upload: one uploadAndPoll for the whole corpus (one index-build
      // wait) instead of a per-document round trip. The filename carries the
      // document id back through search results.
      const files = await Promise.all(
        documents.map(({ document }) =>
          toFile(
            Buffer.from(`${document.title}\n${document.text}`, "utf8"),
            `${document.id}.txt`,
          ),
        ),
      );
      await client.vectorStores.fileBatches.uploadAndPoll(store.id, { files });
      for await (const file of client.vectorStores.files.list(store.id)) {
        fileIds.push(file.id);
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
        documentId: documentIdFromFilename(result.filename),
        score: result.score,
      }));
    },
    close: async () => {
      // Best-effort cleanup: a failed delete must not turn a measured run into
      // an error; the expiry policy set at creation reclaims stragglers, and
      // every failure is a visible stderr warning rather than a silent leak.
      if (vectorStoreId !== null) {
        await client.vectorStores
          .delete(vectorStoreId)
          .catch(
            warnTeardownFailure(
              "openai-vector-store",
              `vector store ${vectorStoreId}`,
            ),
          );
      }
      for (const fileId of fileIds) {
        await client.files
          .delete(fileId)
          .catch(warnTeardownFailure("openai-vector-store", `file ${fileId}`));
      }
    },
  };
};
