import { describe, expect, it } from "vitest";
import type { ResearchHistoryFrame, ResearchSiteTopic } from "./site";
import { findPublishedResearchTopic, historyPathFor } from "./site";
import {
  comparisonSnapshotPoints,
  framesInTendencyWindow,
  instrumentVersionOf,
  renderSnapshot,
  SNAPSHOT_CHAR_BUDGET,
  snapshotBudgetProblems,
  snapshotFixtureNarrative,
  snapshotPointsFor,
  stripSvgMarkup,
  TENDENCY_WINDOW_MONTHS,
} from "./snapshot";

const speedTopic = (): ResearchSiteTopic => {
  const topic = findPublishedResearchTopic("speed");
  if (topic === undefined) throw new Error("missing speed topic");
  return topic;
};

const frameAt = (
  topicId: string,
  generatedAt: string,
): ResearchHistoryFrame => ({
  topicId,
  generatedAt,
  sourcePath: `docs/research-reports/history/${topicId}/stamp/${topicId}.md`,
  japanesePath: `docs/research-reports/history/${topicId}/stamp/${topicId}.ja.md`,
  dataPath: `docs/research-reports/history/${topicId}/stamp/${topicId}.data.json`,
});

const speedArtifact = (
  generatedAt: string,
  configs: ReadonlyArray<{
    id: string;
    modelName: string;
    ttft: ReadonlyArray<number | undefined>;
    effort?: string;
    provenance?: string;
  }>,
): unknown => ({
  generatedAt,
  metrics: ["ttftMs"],
  configs: configs.map((config) => ({
    id: config.id,
    modelName: config.modelName,
    measuredAt: generatedAt,
    provenance: config.provenance ?? "measured",
    ...(config.effort === undefined ? {} : { effort: config.effort }),
    trials: config.ttft.map((value) =>
      value === undefined
        ? { ok: false, metrics: {} }
        : { ok: true, metrics: { ttftMs: value } },
    ),
  })),
});

describe("snapshot budget", () => {
  it("strips SVG markup before counting characters", () => {
    const markdown = `a<svg xmlns="x"><rect/></svg>b<svg>more</svg>c`;
    expect(stripSvgMarkup(markdown)).toBe("abc");
  });

  it("accepts a page at the budget and flags one character over", () => {
    expect(snapshotBudgetProblems("x".repeat(SNAPSHOT_CHAR_BUDGET))).toEqual(
      [],
    );
    const problems = snapshotBudgetProblems(
      "x".repeat(SNAPSHOT_CHAR_BUDGET + 1),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`${SNAPSHOT_CHAR_BUDGET + 1} characters`);
  });

  it("does not count chart SVG against the budget", () => {
    const svg = `<svg>${"y".repeat(SNAPSHOT_CHAR_BUDGET * 2)}</svg>`;
    expect(snapshotBudgetProblems(`ok${svg}`)).toEqual([]);
  });
});

describe("framesInTendencyWindow", () => {
  it("keeps frames within the window anchored on the newest frame", () => {
    const frames = [
      frameAt("speed", "2026-01-01T00:00:00.000Z"),
      frameAt("speed", "2026-05-01T00:00:00.000Z"),
      frameAt("speed", "2026-07-01T00:00:00.000Z"),
    ];
    const windowed = framesInTendencyWindow(frames);
    // 2026-01-01 is more than 5×30 days before 2026-07-01.
    expect(windowed.map((frame) => frame.generatedAt)).toEqual([
      "2026-07-01T00:00:00.000Z",
      "2026-05-01T00:00:00.000Z",
    ]);
  });

  it("uses the newest frame as the anchor, not the wall clock", () => {
    const frames = [
      frameAt("speed", "2020-01-01T00:00:00.000Z"),
      frameAt("speed", "2020-03-01T00:00:00.000Z"),
    ];
    expect(framesInTendencyWindow(frames)).toHaveLength(2);
  });

  it("drops frames with unparsable timestamps", () => {
    const frames = [
      frameAt("speed", "not-a-date"),
      frameAt("speed", "2026-07-01T00:00:00.000Z"),
    ];
    expect(framesInTendencyWindow(frames)).toHaveLength(1);
  });
});

describe("comparisonSnapshotPoints", () => {
  it("averages successful trials per subject and metric", () => {
    const points = comparisonSnapshotPoints(
      speedArtifact("2026-07-01T00:00:00.000Z", [
        { id: "a", modelName: "Model A", ttft: [100, 200, undefined] },
      ]),
    );
    expect(points).toEqual([
      {
        seriesId: "a",
        seriesLabel: "Model A",
        metric: "ttftMs",
        measuredAt: "2026-07-01T00:00:00.000Z",
        value: 150,
      },
    ]);
  });

  it("skips subjects with no successful trials and malformed artifacts", () => {
    expect(
      comparisonSnapshotPoints(
        speedArtifact("2026-07-01T00:00:00.000Z", [
          { id: "a", modelName: "Model A", ttft: [undefined] },
        ]),
      ),
    ).toEqual([]);
    expect(comparisonSnapshotPoints(undefined)).toEqual([]);
    expect(comparisonSnapshotPoints({ configs: "wrong" })).toEqual([]);
  });

  it("never charts fixtured or curated configs as measurements", () => {
    expect(
      comparisonSnapshotPoints(
        speedArtifact("2026-07-01T00:00:00.000Z", [
          {
            id: "a",
            modelName: "Model A",
            ttft: [100],
            provenance: "fixtured",
          },
          { id: "b", modelName: "Model B", ttft: [100], provenance: "curated" },
        ]),
      ),
    ).toEqual([]);
  });

  it("splits effort variants sharing a model id into distinct series", () => {
    const points = comparisonSnapshotPoints(
      speedArtifact("2026-07-01T00:00:00.000Z", [
        { id: "a", modelName: "Model A", ttft: [100], effort: "low" },
        { id: "a", modelName: "Model A", ttft: [300], effort: "high" },
      ]),
    );
    expect(points.map((point) => point.seriesId)).toEqual(["a@low", "a@high"]);
    expect(points.map((point) => point.seriesLabel)).toEqual([
      "Model A (low)",
      "Model A (high)",
    ]);
  });

  it("is registered for the speed and accuracy topics only", () => {
    const artifact = speedArtifact("2026-07-01T00:00:00.000Z", [
      { id: "a", modelName: "Model A", ttft: [100] },
    ]);
    expect(snapshotPointsFor("speed", artifact)).toHaveLength(1);
    expect(snapshotPointsFor("accuracy", artifact)).toHaveLength(1);
    expect(snapshotPointsFor("rag", artifact)).toEqual([]);
  });
});

describe("renderSnapshot", () => {
  const twoFrames = [
    frameAt("speed", "2026-07-01T00:00:00.000Z"),
    frameAt("speed", "2026-06-01T00:00:00.000Z"),
  ];

  const pointsFor = (
    count: number,
  ): ReadonlyArray<{
    seriesId: string;
    seriesLabel: string;
    metric: string;
    measuredAt: string;
    value: number;
  }> =>
    Array.from({ length: count }, (_, index) => [
      {
        seriesId: `model-${index}`,
        seriesLabel: `Model ${index}`,
        metric: "ttftMs",
        measuredAt: "2026-06-01T00:00:00.000Z",
        value: 1000 + index,
      },
      {
        seriesId: `model-${index}`,
        seriesLabel: `Model ${index}`,
        metric: "ttftMs",
        measuredAt: "2026-07-01T00:00:00.000Z",
        value: 900 + index,
      },
    ]).flat();

  it("stays within the compactness budget at full subject scale", () => {
    const markdown = renderSnapshot({
      topic: speedTopic(),
      frames: twoFrames,
      points: pointsFor(59),
    });
    expect(snapshotBudgetProblems(markdown)).toEqual([]);
  });

  it("labels the fixture narrative and links every frame", () => {
    const markdown = renderSnapshot({
      topic: speedTopic(),
      frames: twoFrames,
      points: [],
    });
    expect(markdown).toContain("Deterministic snapshot skeleton");
    expect(markdown).toContain("## Tendency");
    expect(markdown).toContain("## Trials");
    expect(markdown).toContain("## Design");
    expect(markdown).toContain("[English](./history/speed/stamp/speed)");
    expect(markdown).toContain(
      "[data.json](./history/speed/stamp/speed.data.json)",
    );
    expect(markdown).toContain(`last ${TENDENCY_WINDOW_MONTHS} months`);
  });

  it("caps chart series and states the cap", () => {
    const markdown = renderSnapshot({
      topic: speedTopic(),
      frames: twoFrames,
      points: pointsFor(12),
    });
    expect(markdown).toContain("<svg");
    expect(markdown).toContain(
      "Chart shows the 8 leading subjects of 12; every subject is in the trial reports below.",
    );
    // ttftMs is lower-is-better: the lowest latest values lead the chart.
    expect(markdown).toContain("Model 0");
    expect(stripSvgMarkup(markdown)).not.toContain("Model 11");
  });

  it("uses a provided narrative verbatim instead of the skeleton", () => {
    const markdown = renderSnapshot({
      topic: speedTopic(),
      frames: twoFrames,
      points: [],
      narrative: "Latency held steady across the window.",
    });
    expect(markdown).toContain("Latency held steady across the window.");
    expect(markdown).not.toContain("Deterministic snapshot skeleton");
  });

  it("summarizes the frame span in the fixture narrative", () => {
    expect(
      snapshotFixtureNarrative({ topic: speedTopic(), frames: twoFrames }),
    ).toContain("2 dated trials between 2026-06-01 and 2026-07-01");
    expect(
      snapshotFixtureNarrative({ topic: speedTopic(), frames: [] }),
    ).toContain("no dated trials yet");
  });

  it("renders frame links that match historyPathFor output", () => {
    const topic = speedTopic();
    const generatedAt = "2026-07-01T00:00:00.000Z";
    const markdown = renderSnapshot({
      topic,
      frames: [
        {
          topicId: topic.id,
          generatedAt,
          sourcePath: historyPathFor(topic, generatedAt, "source"),
        },
      ],
      points: [],
    });
    expect(markdown).toContain(
      "[English](./history/speed/2026-07-01T00-00-00-000Z/llm-speed-comparison)",
    );
  });
});

describe("instrumentVersionOf", () => {
  it("reads the artifact's instrument version, defaulting to 1", () => {
    expect(instrumentVersionOf({ instrumentVersion: 2 })).toBe(2);
    expect(instrumentVersionOf({})).toBe(1);
    expect(instrumentVersionOf(undefined)).toBe(1);
    expect(instrumentVersionOf({ instrumentVersion: "2" })).toBe(1);
  });
});
