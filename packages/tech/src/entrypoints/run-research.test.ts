import { describe, expect, it } from "vitest";
import { RUNNER_TOPIC_IDS } from "./run-research";
import { TOPICS } from "../research/domain/topic";

describe("run-research dispatcher", () => {
  it("binds a benchmark runner for exactly the benchmark-kind topics", () => {
    // Reference topics (catalog/article) dispatch by kind, not via the runner
    // map; every other topic must have a bound benchmark runner.
    const benchmarkTopicIds = TOPICS.filter(
      (topic) => topic.kind === undefined || topic.kind === "benchmark",
    )
      .map((topic) => topic.id)
      .sort();
    expect(RUNNER_TOPIC_IDS).toEqual(benchmarkTopicIds);
  });
});
