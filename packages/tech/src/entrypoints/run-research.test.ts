import { describe, expect, it } from "vitest";
import { RUNNER_TOPIC_IDS } from "./run-research";
import { topicIds } from "../research/domain/topic";

describe("run-research dispatcher", () => {
  it("binds a runner for exactly the registered topics", () => {
    expect(RUNNER_TOPIC_IDS).toEqual([...topicIds()].sort());
  });
});
