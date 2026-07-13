import { describe, expect, it } from "vitest";
import {
  emptyBucket,
  sweepAutoRagOrphansWithApi,
  teardownAutoRagResources,
  type AutoRagApi,
} from "./autorag";

type Call = Readonly<{ path: string; method: string }>;

/**
 * Fake Cloudflare API: routes are matched by `${method} ${path-prefix}`; a
 * matching handler returns the response body or throws. Every call is recorded
 * so tests can assert teardown ordering and coverage.
 */
const createFakeApi = (
  handlers: ReadonlyArray<
    Readonly<{
      method: string;
      path: string;
      respond: (call: Call, hits: number) => Record<string, unknown>;
    }>
  >,
): Readonly<{ api: AutoRagApi; calls: ReadonlyArray<Call> }> => {
  const calls: Array<Call> = [];
  const hitCounts = new Map<unknown, number>();
  const api: AutoRagApi = (path, init) => {
    const method = init.method ?? "GET";
    const call = { path, method };
    calls.push(call);
    const handler = handlers.find(
      (candidate) =>
        candidate.method === method && path.startsWith(candidate.path),
    );
    if (handler === undefined) {
      return Promise.reject(new Error(`unhandled ${method} ${path}`));
    }
    const hits = hitCounts.get(handler) ?? 0;
    hitCounts.set(handler, hits + 1);
    return Promise.resolve(handler.respond(call, hits));
  };
  return { api, calls };
};

const ok = (): Record<string, unknown> => ({ success: true, result: null });

describe("emptyBucket", () => {
  it("deletes objects page by page until the bucket is empty", async () => {
    const pages = [
      [{ key: "a.txt" }, { key: "b.txt" }],
      [{ key: "c.txt" }],
      [],
    ];
    const { api, calls } = createFakeApi([
      {
        method: "GET",
        path: "/r2/buckets/bkt/objects",
        respond: (_call, hits) => ({
          success: true,
          result: pages[Math.min(hits, pages.length - 1)],
        }),
      },
      { method: "DELETE", path: "/r2/buckets/bkt/objects/", respond: ok },
    ]);
    const warnings: Array<string> = [];
    const emptied = await emptyBucket(api, "bkt", (m) => warnings.push(m));
    expect(emptied).toBe(true);
    expect(warnings).toEqual([]);
    const deletes = calls.filter((call) => call.method === "DELETE");
    expect(deletes.map((call) => call.path)).toEqual([
      "/r2/buckets/bkt/objects/a.txt",
      "/r2/buckets/bkt/objects/b.txt",
      "/r2/buckets/bkt/objects/c.txt",
    ]);
  });

  it("stops (with a warning) instead of spinning when no object can be deleted", async () => {
    const { api, calls } = createFakeApi([
      {
        method: "GET",
        path: "/r2/buckets/bkt/objects",
        respond: () => ({ success: true, result: [{ key: "stuck.txt" }] }),
      },
    ]);
    const warnings: Array<string> = [];
    const emptied = await emptyBucket(api, "bkt", (m) => warnings.push(m));
    expect(emptied).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
    // One list, one failed delete, then no further passes.
    expect(calls.length).toBe(2);
  });
});

describe("teardownAutoRagResources", () => {
  it("empties the bucket, then deletes bucket, then the instance", async () => {
    const { api, calls } = createFakeApi([
      {
        method: "GET",
        path: "/r2/buckets/bkt/objects",
        respond: (_call, hits) => ({
          success: true,
          result: hits === 0 ? [{ key: "doc.txt" }] : [],
        }),
      },
      { method: "DELETE", path: "/r2/buckets/bkt/objects/", respond: ok },
      { method: "DELETE", path: "/r2/buckets/bkt", respond: ok },
      { method: "DELETE", path: "/autorag/rags/rag-1", respond: ok },
    ]);
    const clean = await teardownAutoRagResources(
      api,
      { ragId: "rag-1", bucketName: "bkt" },
      () => undefined,
    );
    expect(clean).toBe(true);
    const deletes = calls
      .filter((call) => call.method === "DELETE")
      .map((call) => call.path);
    expect(deletes).toEqual([
      "/r2/buckets/bkt/objects/doc.txt",
      "/r2/buckets/bkt",
      "/autorag/rags/rag-1",
    ]);
  });

  it("still deletes the instance and reports unclean when the bucket cannot be emptied", async () => {
    const { api, calls } = createFakeApi([
      {
        method: "GET",
        path: "/r2/buckets/bkt/objects",
        respond: () => {
          throw new Error("list failed");
        },
      },
      { method: "DELETE", path: "/autorag/rags/rag-1", respond: ok },
    ]);
    const warnings: Array<string> = [];
    const clean = await teardownAutoRagResources(
      api,
      { ragId: "rag-1", bucketName: "bkt" },
      (m) => warnings.push(m),
    );
    expect(clean).toBe(false);
    expect(warnings.some((m) => m.includes("bkt"))).toBe(true);
    // The bucket-delete is skipped (still non-empty) but the instance is removed.
    expect(
      calls.some(
        (call) =>
          call.method === "DELETE" && call.path === "/autorag/rags/rag-1",
      ),
    ).toBe(true);
    expect(
      calls.some(
        (call) => call.method === "DELETE" && call.path === "/r2/buckets/bkt",
      ),
    ).toBe(false);
  });

  it("is a no-op when nothing was created", async () => {
    const { api, calls } = createFakeApi([]);
    const clean = await teardownAutoRagResources(api, {}, () => undefined);
    expect(clean).toBe(true);
    expect(calls).toEqual([]);
  });
});

describe("sweepAutoRagOrphansWithApi", () => {
  it("removes only rag-bench-prefixed instances and buckets", async () => {
    const { api, calls } = createFakeApi([
      {
        method: "GET",
        path: "/autorag/rags",
        respond: () => ({
          success: true,
          result: [{ id: "rag-bench-dead" }, { id: "production-rag" }],
        }),
      },
      {
        method: "GET",
        path: "/r2/buckets/rag-bench-corpus-dead/objects",
        respond: () => ({ success: true, result: [] }),
      },
      {
        method: "GET",
        path: "/r2/buckets",
        respond: () => ({
          success: true,
          result: {
            buckets: [{ name: "rag-bench-corpus-dead" }, { name: "assets" }],
          },
        }),
      },
      { method: "DELETE", path: "/autorag/rags/rag-bench-dead", respond: ok },
      {
        method: "DELETE",
        path: "/r2/buckets/rag-bench-corpus-dead",
        respond: ok,
      },
    ]);
    const summary = await sweepAutoRagOrphansWithApi(api, () => undefined);
    expect(summary).toEqual({ ragsDeleted: 1, bucketsDeleted: 1, clean: true });
    const deletes = calls
      .filter((call) => call.method === "DELETE")
      .map((call) => call.path);
    expect(deletes).toEqual([
      "/autorag/rags/rag-bench-dead",
      "/r2/buckets/rag-bench-corpus-dead",
    ]);
  });
});
