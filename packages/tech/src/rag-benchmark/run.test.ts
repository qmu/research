import { describe, expect, it, vi } from "vitest";
import { measureBackendTrial, runRagBenchmark } from "./run";
import type { Backend, VectorStore } from "./domain/types";
import { createFixtureEmbeddingClient } from "../vendors/embedding/fixture";

describe("runRagBenchmark", () => {
  it("runs the keyless fixture path", async () => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
    expect(result.fixture).toBe(true);
    expect(result.runs.length).toBeGreaterThanOrEqual(2);
    expect(result.runs.every((run) => run.provenance === "fixtured")).toBe(
      true,
    );
    expect(result.runs[0]?.retrieval.recallAtK).toBeGreaterThan(0);
    expect(result.runs[0]?.retrieval.queryCount).toBe(3);
    expect(result.runs[0]?.operational.trialCount).toBe(1);
  });

  it("runs sqlite-vec locally without API credentials", async () => {
    const result = await runRagBenchmark({
      fixture: false,
      k: 3,
      trials: 1,
      backends: ["sqlite-vec"],
    });
    expect(result.runs[0]?.backend.id).toBe("sqlite-vec");
    expect(result.runs[0]?.provenance).toBe("measured");
    expect(result.runs[0]?.operational.costUsd).toBe(0);
    expect(result.runs[0]?.retrieval.trialStdDev).toBeUndefined();
  });

  it("renders a key-absent managed backend as fixtured, never faked", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await runRagBenchmark({
        fixture: false,
        k: 3,
        trials: 1,
        backends: ["openai-vector-store"],
      });
      expect(result.runs[0]?.backend.id).toBe("openai-vector-store");
      expect(result.runs[0]?.backend.isolatedStore).toBe(false);
      expect(result.runs[0]?.provenance).toBe("fixtured");
      expect(result.runs[0]?.operational.costUsd).toBe(0);
      expect(result.runs[0]?.retrieval.intervalNote).toContain("deterministic");
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });

  it("renders every credential-absent cloud backend as fixtured, never faked", async () => {
    const gatedEnv = [
      "AWS_PROFILE",
      "AWS_ACCESS_KEY_ID",
      "CLOUDFLARE_API_TOKEN",
    ];
    const saved = new Map(gatedEnv.map((name) => [name, process.env[name]]));
    for (const name of gatedEnv) delete process.env[name];
    try {
      const result = await runRagBenchmark({
        fixture: false,
        k: 3,
        trials: 1,
        backends: ["s3-vectors", "vectorize", "autorag"],
      });
      expect(result.runs.map((run) => run.backend.id)).toEqual([
        "s3-vectors",
        "vectorize",
        "autorag",
      ]);
      // Credential absent → deterministic fixture store, never a live call.
      expect(result.runs.every((run) => run.provenance === "fixtured")).toBe(
        true,
      );
    } finally {
      for (const [name, value] of saved) {
        if (value !== undefined) process.env[name] = value;
      }
    }
  });
});

describe("measureBackendTrial teardown", () => {
  const backend: Backend = {
    id: "fake",
    name: "Fake store",
    kind: "self-managed",
    embeddingCoupling: "fixed",
    isolatedStore: true,
    retrievalDeterministic: true,
    source: "test",
    costNote: "test",
    metadataFiltering: false,
  };

  const createFakeStore = (
    overrides: Partial<VectorStore>,
    closed: { value: boolean },
  ): VectorStore => ({
    id: "fake",
    upsert: async () => undefined,
    query: async () => [],
    close: async () => {
      closed.value = true;
    },
    ...overrides,
  });

  const runTrial = (store: VectorStore) =>
    measureBackendTrial(
      backend,
      { keyEnv: [], create: () => store },
      createFixtureEmbeddingClient(),
      false,
      [{ document: { id: "d1", title: "t", text: "x" }, vector: [0.1] }],
      [{ id: "q1", text: "t" }],
      [[0.1]],
      [],
      1,
      false,
    );

  it("closes the store when ingest throws", async () => {
    const closed = { value: false };
    const store = createFakeStore(
      {
        upsert: () => Promise.reject(new Error("ingest failed")),
      },
      closed,
    );
    await expect(runTrial(store)).rejects.toThrow("ingest failed");
    expect(closed.value).toBe(true);
  });

  it("closes the store when a query throws", async () => {
    const closed = { value: false };
    const store = createFakeStore(
      {
        query: () => Promise.reject(new Error("query failed")),
      },
      closed,
    );
    await expect(runTrial(store)).rejects.toThrow("query failed");
    expect(closed.value).toBe(true);
  });

  it("keeps a measured trial and warns when only close() fails", async () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      const store = createFakeStore(
        {
          close: () => Promise.reject(new Error("teardown failed")),
        },
        { value: false },
      );
      const trial = await runTrial(store);
      expect(trial.operational.maxScale).toBe(1);
      expect(write).toHaveBeenCalledWith(
        expect.stringContaining("teardown warning (fake)"),
      );
    } finally {
      write.mockRestore();
    }
  });

  it("propagates the measurement error, not the close() error", async () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      const store = createFakeStore(
        {
          upsert: () => Promise.reject(new Error("ingest failed")),
          close: () => Promise.reject(new Error("teardown failed")),
        },
        { value: false },
      );
      await expect(runTrial(store)).rejects.toThrow("ingest failed");
      expect(write).toHaveBeenCalledWith(
        expect.stringContaining("teardown failed"),
      );
    } finally {
      write.mockRestore();
    }
  });
});
