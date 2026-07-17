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

  it("registers the existing topics plus the speed/accuracy split", () => {
    expect(topicIds()).toEqual(
      expect.arrayContaining([
        "llm-model-comparison",
        "speed",
        "accuracy",
        "rag",
        "ocr",
        "availability",
      ]),
    );
  });

  it("runs insights + translation for the migrated benchmark topics", () => {
    for (const id of ["rag", "ocr", "availability"]) {
      const topic = findTopic(id);
      expect(topic?.stages).toEqual(["benchmark", "insights", "translation"]);
    }
  });

  it("finds a topic by id and misses cleanly", () => {
    expect(findTopic("rag")?.artifactBase).toBe("rag-benchmark");
    expect(findTopic("nope")).toBeUndefined();
  });

  it("marks exactly the topics whose keyless run rewrites the current page in place", () => {
    // These rewrite docs/research-reports/<artifactBase>.md on the keyless
    // path, so the dispatcher re-composes the survey-series blocks after the
    // benchmark stage to keep the committed page byte-stable.
    for (const id of [
      "rag",
      "ocr",
      "availability",
      "foundation-models",
      "image-generation",
      "speech",
      "computer-use",
      "svg-generation",
      "deep-research",
      "agent-vm",
      "trend-recency",
    ]) {
      expect(requireTopic(id).fixtureRewritesCurrentPage).toBe(true);
    }
    // speed/accuracy/llm-model-comparison write *.fixture.md side files and
    // agent-sdk is a hand-authored article; none clobber the current page.
    for (const id of [
      "speed",
      "accuracy",
      "llm-model-comparison",
      "agent-sdk",
    ]) {
      expect(requireTopic(id).fixtureRewritesCurrentPage).toBeUndefined();
    }
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
  it("runs only the benchmark stage for a benchmark-only topic, regardless of mode", () => {
    const combined = requireTopic("llm-model-comparison");
    expect(planPipeline(combined, "fixture")).toEqual(["benchmark"]);
    expect(planPipeline(combined, "real")).toEqual(["benchmark"]);
  });

  it("runs the LLM stages on real for a migrated topic, but not on fixture", () => {
    const rag = requireTopic("rag");
    expect(planPipeline(rag, "fixture")).toEqual(["benchmark"]);
    expect(planPipeline(rag, "real")).toEqual([
      "benchmark",
      "insights",
      "translation",
    ]);
  });

  it("keeps declared LLM stages off the keyless fixture path but prices them on estimate", () => {
    const withStages = {
      ...requireTopic("rag"),
      stages: ["benchmark", "insights", "translation"] as const,
    };
    expect(planPipeline(withStages, "fixture")).toEqual(["benchmark"]);
    expect(planPipeline(withStages, "estimate")).toEqual([
      "benchmark",
      "insights",
      "translation",
    ]);
    expect(planPipeline(withStages, "real")).toEqual([
      "benchmark",
      "insights",
      "translation",
    ]);
  });
});
