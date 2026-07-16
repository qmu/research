import type { QuestionManifest } from "./types";

/**
 * The fixed research-question set every subject answers, with a mechanical yes/no
 * rubric per question. Questions are deliberately **domain-neutral and
 * well-documented** so the answers are checkable and reproducible across months
 * — the reproducibility premise in the mission `proposal.md`. Rubric items score
 * checkable coverage, never prose quality. History connects same-`version`
 * points only; changing a question or rubric is a version bump.
 */
export const QUESTION_MANIFEST: QuestionManifest = {
  version: "2026-07",
  questions: [
    {
      id: "http3-quic",
      prompt:
        "What are the main technical differences between HTTP/2 and HTTP/3, and why was the QUIC transport protocol introduced?",
      rubric: [
        {
          id: "head-of-line",
          question:
            "Does the report explain that HTTP/3 removes TCP-level head-of-line blocking that affected HTTP/2?",
        },
        {
          id: "quic-udp",
          question: "Does it state that QUIC runs over UDP (rather than TCP)?",
        },
        {
          id: "tls13",
          question:
            "Does it mention that QUIC integrates TLS 1.3 into the transport handshake?",
        },
        {
          id: "spec-citation",
          question:
            "Does it cite at least one authoritative source (e.g. an IETF RFC or the protocol specification)?",
        },
      ],
    },
    {
      id: "grid-batteries",
      prompt:
        "Compare lithium-ion and sodium-ion batteries for grid-scale energy storage, covering energy density, cost/material availability, and commercialization status.",
      rubric: [
        {
          id: "energy-density",
          question:
            "Does the report compare the energy density of lithium-ion versus sodium-ion?",
        },
        {
          id: "materials-cost",
          question:
            "Does it discuss material availability or cost (e.g. sodium abundance vs. lithium supply)?",
        },
        {
          id: "commercialization",
          question:
            "Does it describe the current commercialization/deployment status of sodium-ion for grid storage?",
        },
        {
          id: "sourced",
          question:
            "Are the comparative claims backed by at least two distinct cited sources?",
        },
      ],
    },
    {
      id: "svb-collapse",
      prompt:
        "What were the principal causes of the March 2023 collapse of Silicon Valley Bank?",
      rubric: [
        {
          id: "duration-risk",
          question:
            "Does the report identify interest-rate / duration risk on SVB's long-dated bond portfolio?",
        },
        {
          id: "deposit-concentration",
          question:
            "Does it note the concentration of uninsured deposits in the tech/startup sector?",
        },
        {
          id: "bank-run",
          question:
            "Does it describe the rapid deposit withdrawal (bank run) that triggered the failure?",
        },
        {
          id: "dated-sources",
          question:
            "Does it cite reporting or filings from 2023 or later about the event?",
        },
      ],
    },
    {
      id: "intermittent-fasting",
      prompt:
        "Summarize the current scientific evidence on the health effects of intermittent fasting, distinguishing well-supported findings from uncertain ones.",
      rubric: [
        {
          id: "weight-vs-metabolic",
          question:
            "Does the report distinguish weight-loss effects from broader metabolic-health claims?",
        },
        {
          id: "limitations",
          question:
            "Does it acknowledge limitations, mixed evidence, or that some findings are uncertain?",
        },
        {
          id: "peer-reviewed",
          question:
            "Does it cite at least one peer-reviewed study or meta-analysis?",
        },
        {
          id: "no-overclaim",
          question:
            "Does it avoid stating unproven benefits as established fact?",
        },
      ],
    },
  ],
};
