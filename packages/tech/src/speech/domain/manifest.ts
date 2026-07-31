import type { SpeechManifest } from "./types";

/**
 * The versioned utterance manifest. TTS texts are punctuation-light,
 * numeral-free sentences so a transcription judge scores them unambiguously
 * (spelled-out numbers vs digits would corrupt a mechanical word match). STT
 * references are Harvard sentences — a standard, phonetically balanced,
 * public-domain set with freely available recordings — so a real run reads a
 * citable clip per id. Changing this manifest is a version bump; history charts
 * connect same-version points only.
 */
export const SPEECH_MANIFEST: SpeechManifest = {
  version: "1",
  tts: [
    {
      id: "tts-pangram",
      text: "The quick brown fox jumps over the lazy dog",
    },
    {
      id: "tts-clarity",
      text: "She sells seashells by the seashore on a sunny day",
    },
    {
      id: "tts-common",
      text: "Please remember to bring your umbrella and jacket tomorrow",
    },
  ],
  stt: [
    {
      id: "stt-birch",
      referenceTranscript: "The birch canoe slid on the smooth planks",
      audioSource:
        "Harvard sentences list 1, Open Speech Repository (public domain): https://www.voiptroubleshooter.com/open_speech/american.html",
    },
    {
      id: "stt-glue",
      referenceTranscript: "Glue the sheet to the dark blue background",
      audioSource:
        "Harvard sentences list 1, Open Speech Repository (public domain): https://www.voiptroubleshooter.com/open_speech/american.html",
    },
    {
      id: "stt-depth",
      referenceTranscript: "It is easy to tell the depth of a well",
      audioSource:
        "Harvard sentences list 1, Open Speech Repository (public domain): https://www.voiptroubleshooter.com/open_speech/american.html",
    },
  ],
  sts: [
    {
      id: "sts-greeting",
      // A single short, punctuation-light turn: it bounds token-billed cost and
      // keeps the round-trip a well-defined "time to first spoken audio", not a
      // long generation whose length would dominate the latency.
      prompt: "Please say a short friendly greeting",
    },
  ],
};
