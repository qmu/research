import type { BenchmarkDataset } from "./types";

export const SCIFACT_MINI: BenchmarkDataset = {
  id: "scifact-mini",
  name: "SciFact miniature subset",
  source: "https://github.com/allenai/scifact",
  license:
    "SciFact is Apache-2.0; this miniature fixture is repository-authored from SciFact-style claims.",
  documents: [
    {
      id: "D1",
      title: "Statin therapy and cardiovascular events",
      text: "Randomized trials report that statin therapy lowers LDL cholesterol and reduces major cardiovascular events in adults at elevated risk.",
    },
    {
      id: "D2",
      title: "Vitamin D and fracture risk",
      text: "Meta analyses of vitamin D supplementation show mixed fracture outcomes, with stronger effects when calcium is co-administered.",
    },
    {
      id: "D3",
      title: "CRISPR gene editing specificity",
      text: "CRISPR Cas9 systems can edit targeted genomic loci, but guide RNA design and delivery method influence off target activity.",
    },
    {
      id: "D4",
      title: "Mask use and respiratory droplets",
      text: "Laboratory studies show that face masks reduce emitted respiratory droplets during speech and coughing compared with no mask.",
    },
    {
      id: "D5",
      title: "Exercise and insulin sensitivity",
      text: "Regular aerobic exercise improves insulin sensitivity and glycemic control in adults with type 2 diabetes.",
    },
  ],
  queries: [
    {
      id: "Q1",
      text: "Do statins reduce cardiovascular events in adults at risk?",
    },
    {
      id: "Q2",
      text: "Does CRISPR editing depend on guide RNA design for specificity?",
    },
    {
      id: "Q3",
      text: "Can masks reduce respiratory droplets from speech and coughing?",
    },
  ],
  qrels: [
    { queryId: "Q1", documentId: "D1", relevance: 2 },
    { queryId: "Q2", documentId: "D3", relevance: 2 },
    { queryId: "Q3", documentId: "D4", relevance: 2 },
  ],
};

export const loadDataset = (): BenchmarkDataset => SCIFACT_MINI;
