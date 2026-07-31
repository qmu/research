import { describe, expect, it } from "vitest";
import {
  assemblyAiTranscriptState,
  extractAssemblyAiUploadUrl,
} from "./assemblyai";

describe("extractAssemblyAiUploadUrl", () => {
  it("reads a non-empty upload_url", () => {
    expect(
      extractAssemblyAiUploadUrl({
        upload_url: "https://cdn.assemblyai.com/x",
      }),
    ).toBe("https://cdn.assemblyai.com/x");
  });

  it("is total over missing / malformed shapes", () => {
    expect(extractAssemblyAiUploadUrl(null)).toBeUndefined();
    expect(extractAssemblyAiUploadUrl({})).toBeUndefined();
    expect(extractAssemblyAiUploadUrl({ upload_url: "" })).toBeUndefined();
    expect(extractAssemblyAiUploadUrl({ upload_url: 7 })).toBeUndefined();
  });
});

describe("assemblyAiTranscriptState", () => {
  it("maps completed to a done state carrying the text", () => {
    expect(
      assemblyAiTranscriptState({
        status: "completed",
        text: "glue the sheet",
      }),
    ).toEqual({ state: "completed", text: "glue the sheet" });
  });

  it("maps queued / processing to pending", () => {
    expect(assemblyAiTranscriptState({ status: "queued" }).state).toBe(
      "pending",
    );
    expect(assemblyAiTranscriptState({ status: "processing" }).state).toBe(
      "pending",
    );
  });

  it("maps error to a failed state with the reason", () => {
    expect(
      assemblyAiTranscriptState({ status: "error", error: "bad audio" }),
    ).toEqual({ state: "error", text: "", error: "bad audio" });
  });

  it("treats an unknown / malformed status as pending", () => {
    expect(assemblyAiTranscriptState(null).state).toBe("pending");
    expect(assemblyAiTranscriptState({}).state).toBe("pending");
    expect(assemblyAiTranscriptState({ status: "weird" }).state).toBe(
      "pending",
    );
  });
});
