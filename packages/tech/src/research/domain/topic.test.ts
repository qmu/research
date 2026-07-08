import { describe, expect, it } from "vitest";
import {
  buildLegacyArgv,
  findTopic,
  planPipeline,
  topicIds,
  TOPICS,
  type TopicSpec,
} from "./topic";

const requireTopic = (id: string): TopicSpec => {
  const found = findTopic(id);
  if (found === undefined) throw new Error(`no such topic: ${id}`);
  return found;
};

describe("topic registry", () => {
  it("exposes unique, non-empty topic ids", () => {
    const ids = topicIds();
    expect(ids.length).toBe(TOPICS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it("registers the four existing topics", () => {
    expect(topicIds()).toEqual(
      expect.arrayContaining([
        "llm-model-comparison",
        "rag",
        "ocr",
        "availability",
      ]),
    );
  });

  it("finds a topic by id and misses cleanly", () => {
    expect(findTopic("rag")?.artifactBase).toBe("rag-benchmark");
    expect(findTopic("nope")).toBeUndefined();
  });

  it("every topic supports fixture/estimate/real with matching argv", () => {
    for (const topic of TOPICS) {
      for (const mode of ["fixture", "estimate", "real"] as const) {
        expect(topic.modes).toContain(mode);
        expect(topic.modeArgv[mode]).toBeDefined();
      }
    }
  });
});

describe("buildLegacyArgv", () => {
  it("prefixes the mode flag and passes user args through", () => {
    const rag = requireTopic("rag");
    expect(buildLegacyArgv(rag, "fixture", [])).toEqual(["--fixture"]);
    expect(buildLegacyArgv(rag, "real", ["--trials", "3"])).toEqual([
      "--trials",
      "3",
    ]);
    expect(buildLegacyArgv(rag, "estimate", [])).toEqual(["--estimate"]);
  });

  it("maps OCR's inverted flags: fixture is the default, real takes --real", () => {
    const ocr = requireTopic("ocr");
    expect(buildLegacyArgv(ocr, "fixture", [])).toEqual([]);
    expect(buildLegacyArgv(ocr, "real", [])).toEqual(["--real"]);
  });

  it("throws on an unsupported mode", () => {
    const rag = requireTopic("rag");
    expect(() =>
      buildLegacyArgv({ ...rag, modes: ["fixture"] }, "real", []),
    ).toThrow(/does not support/);
  });
});

describe("planPipeline", () => {
  it("runs only the benchmark stage today, regardless of mode", () => {
    const rag = requireTopic("rag");
    expect(planPipeline(rag, "fixture")).toEqual(["benchmark"]);
    expect(planPipeline(rag, "real")).toEqual(["benchmark"]);
  });

  it("keeps declared LLM stages off the keyless fixture path", () => {
    const withStages = {
      ...requireTopic("rag"),
      stages: ["benchmark", "insights", "translation"] as const,
    };
    expect(planPipeline(withStages, "fixture")).toEqual(["benchmark"]);
    expect(planPipeline(withStages, "real")).toEqual([
      "benchmark",
      "insights",
      "translation",
    ]);
  });
});
