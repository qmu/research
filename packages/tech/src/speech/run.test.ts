import { describe, expect, it } from "vitest";
import { estimateSpeech, runSpeechComparison } from "./run";
import { SPEECH_MODELS } from "./models";

describe("runSpeechComparison (fixture path)", () => {
  it("scores every subject perfectly through the keyless clients", async () => {
    const result = await runSpeechComparison({ fixture: true, trials: 1 });

    expect(result.fixture).toBe(true);
    expect(result.judgeModel).toBe("fixture-judge");
    expect(result.runs).toHaveLength(SPEECH_MODELS.length);
    // Deterministic, byte-stable timestamp on the fixture path.
    expect(result.generatedAt).toBe("2026-01-01T00:00:00.000Z");

    for (const run of result.runs) {
      expect(run.provenance, run.id).toBe("fixtured");
      expect(run.stats.latencyMs.mean, run.id).toBeGreaterThan(0);
      if (run.capability === "tts") {
        // The fixture judge echoes the source text → perfect intelligibility.
        expect(run.stats.intelligibility.mean, run.id).toBe(1);
        expect(run.stats.wordAccuracy.n, run.id).toBe(0);
      } else {
        // The fixture STT client returns the reference → perfect word accuracy.
        expect(run.stats.wordAccuracy.mean, run.id).toBe(1);
        expect(run.stats.intelligibility.n, run.id).toBe(0);
      }
    }
  });

  it("catalogs speech-to-speech capability and the non-subject provider", async () => {
    const result = await runSpeechComparison({ fixture: true, trials: 1 });
    expect(result.stsCapabilities.length).toBeGreaterThan(0);
    expect(result.stsCapabilities.every((entry) => entry.duplexRealtime)).toBe(
      true,
    );
    expect(
      result.nonSubjects.some((entry) => entry.providerName === "Anthropic"),
    ).toBe(true);
  });

  it("records repetitions as stdDev-bearing samples", async () => {
    const result = await runSpeechComparison({ fixture: true, trials: 3 });
    for (const run of result.runs) {
      expect(run.trialsRequested, run.id).toBe(3);
      // 3 repetitions × utterances per capability.
      expect(run.calls.length, run.id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("estimateSpeech", () => {
  it("prices a real run with a stated ceiling and no provider calls", () => {
    const text = estimateSpeech(undefined, 1);
    expect(text).toContain("speech estimate");
    expect(text).toContain("agreed ceiling: $10/trial");
    for (const card of SPEECH_MODELS) {
      expect(text).toContain(card.id);
    }
  });
});
