export const EN_RESEARCH_TITLE = "LLMs Research";
export const JA_RESEARCH_TITLE = "LLM基礎検証";

/**
 * The qmu-co-jp sidebar group the published articles live under. qmu-co-jp
 * groups follow the 「<テーマ>について」 convention, so the group label is the
 * Japanese surface title plus について. Carried in the publish ticket payload
 * so the qmu-co-jp drive applies it instead of inventing its own label.
 */
export const QMU_RESEARCH_GROUP_LABEL = `${JA_RESEARCH_TITLE}について`;

export type ResearchPage = Readonly<{
  text: string;
  link: string;
}>;

export type ResearchTopicPage = Readonly<{
  text: string;
  docsPath: string;
  summary: string;
}>;

export type MetricDirection =
  | "lower-is-better"
  | "higher-is-better"
  | "reference";

export type ResearchMetric = Readonly<{
  name: string;
  unit: string;
  direction: MetricDirection;
}>;

export type TrialsPerRun = Readonly<{
  minimum: number;
  maximum: number;
  premises: string;
}>;

export type CostBudget = Readonly<{
  ceilingUsd: number;
  premises: string;
}>;

/**
 * The per-topic research design the proposal-first protocol
 * (docs/research-development-guideline.md) agrees with the developer. Recorded
 * as shared metadata so the snapshot page, the cost gate before a real run,
 * and the accumulated history all read the same agreed values.
 */
export type ResearchDesign = Readonly<{
  cadence: string;
  offCadenceTrigger: string;
  subjects: string;
  metrics: ReadonlyArray<ResearchMetric>;
  trialsPerRun: TrialsPerRun;
  costPerRun: CostBudget;
  accumulates: string;
}>;

export type ResearchSiteTopic = Readonly<{
  id: string;
  artifactBase: string;
  npmScript: string;
  source: ResearchTopicPage;
  japanese: ResearchTopicPage;
  dataPath?: string;
  qmuSlug: string;
  design: ResearchDesign;
  /**
   * "snapshot": the sidebar page (source/japanese docsPath) is the compact
   * renderer-produced snapshot over the dated trial frames, and the full
   * trial report lives at `report.*` for archiving. Absent (default): the
   * sidebar page is the full report itself (pre-ADR-0005 layout).
   */
  articleMode?: "snapshot";
  report?: Readonly<{
    sourcePath: string;
    japanesePath: string;
  }>;
}>;

export type InternalResearchSource = Readonly<{
  id: string;
  artifactBase: string;
  npmScript: string;
  sourceForTopicIds: ReadonlyArray<string>;
  dataPaths: ReadonlyArray<string>;
  sideMarkdownPaths: ReadonlyArray<string>;
}>;

const stripMarkdown = (path: string): string => path.replace(/\.md$/, "");

const docsLink = (path: string): string =>
  `/${stripMarkdown(path.replace(/^docs\//, ""))}`;

export const overview = {
  source: { text: "Overview", link: "/research-reports/" },
  japanese: { text: "はじめに", link: "/llm-foundation/" },
} satisfies Readonly<{ source: ResearchPage; japanese: ResearchPage }>;

export const historyOverview = {
  source: { text: "History", link: "/research-reports/history" },
  japanese: { text: "History", link: "/llm-foundation/history" },
} satisfies Readonly<{ source: ResearchPage; japanese: ResearchPage }>;

export const publishedResearchTopics: ReadonlyArray<ResearchSiteTopic> = [
  {
    id: "foundation-models",
    artifactBase: "foundation-models",
    npmScript: "npm run research -- foundation-models --real",
    source: {
      text: "Foundation model catalog",
      docsPath: "docs/research-reports/foundation-models.md",
      summary:
        "A reference catalog of the compared models: provider, tier, price, effort, and API surface.",
    },
    japanese: {
      text: "対象モデル",
      docsPath: "docs/research-reports/foundation-models.insights.ja.md",
      summary:
        "対象モデルのプロバイダー、tier、価格、effort、API サーフェスの参照カタログ。",
    },
    dataPath: "docs/research-reports/foundation-models.data.json",
    qmuSlug: "foundation-models",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a provider model release",
      subjects: "models in the shared model registry",
      metrics: [
        { name: "inputCostPerMTok", unit: "USD/MTok", direction: "reference" },
        { name: "outputCostPerMTok", unit: "USD/MTok", direction: "reference" },
      ],
      trialsPerRun: {
        minimum: 0,
        maximum: 0,
        premises: "curated catalog rows; no measurement calls",
      },
      costPerRun: {
        ceilingUsd: 0,
        premises: "keyless and costless; reads the committed model registry",
      },
      accumulates: "catalog revisions, one dated frame per archive",
    },
  },
  {
    // Reference topic (design comparison, not measured): both pages are
    // hand-authored — the Japanese article is the canonical original at its
    // long-served URL, the English page its hand-written counterpart. No LLM
    // stage runs for this topic; provenance labels (design comparison /
    // 未測定 / 要確認) are carried in the articles themselves.
    id: "agent-sdk",
    artifactBase: "agent-sdk-comparison",
    npmScript: "npm run research -- agent-sdk --fixture",
    source: {
      text: "Agent SDK comparison",
      docsPath: "docs/research-reports/agent-sdk-comparison.md",
      summary:
        "A design comparison of agent frameworks/runtimes (OpenAI Agents SDK, Claude Agent SDK, Cloudflare Agents SDK, LangGraph) from public documentation — not measured.",
    },
    japanese: {
      text: "Agent SDKの比較",
      docsPath: "docs/llm-foundation/agent-sdk-comparison.md",
      summary:
        "公開ドキュメントに基づく agent framework / runtime の設計比較。設計比較 / 未測定 / 要確認 の provenance を各セルに明記する。",
    },
    qmuSlug: "agent-sdk-comparison",
    design: {
      cadence: "quarterly",
      offCadenceTrigger:
        "a major agent SDK release or a breaking design change at a covered SDK",
      subjects:
        "OpenAI Agents SDK, Claude Agent SDK, Cloudflare Agents SDK, LangGraph — public documentation only",
      metrics: [
        {
          name: "designComparison",
          unit: "provenance-labelled cells",
          direction: "reference",
        },
      ],
      trialsPerRun: {
        minimum: 0,
        maximum: 0,
        premises:
          "hand-authored design comparison over public documentation; no measurement calls",
      },
      costPerRun: {
        ceilingUsd: 0,
        premises: "keyless and costless; reads public documentation only",
      },
      accumulates:
        "dated revisions of the design comparison, one frame per archive",
    },
  },
  {
    id: "speed",
    artifactBase: "llm-speed-comparison",
    npmScript: "npm run research -- speed --real",
    source: {
      text: "LLM response speed",
      docsPath: "docs/research-reports/llm-speed-comparison.md",
      summary: "Sustained throughput, time-to-first-token, and total latency.",
    },
    japanese: {
      text: "応答速度",
      docsPath: "docs/research-reports/llm-speed-comparison.insights.ja.md",
      summary: "持続スループット、time-to-first-token、総レイテンシの比較。",
    },
    dataPath: "docs/research-reports/llm-speed-comparison.data.json",
    qmuSlug: "llm-speed-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a major model release",
      subjects:
        "models in the foundation-models catalog, at most 3 efforts per model (lowest, intermediate, highest)",
      metrics: [
        { name: "ttftMs", unit: "ms", direction: "lower-is-better" },
        {
          name: "throughputTokensPerSec",
          unit: "tokens/s",
          direction: "higher-is-better",
        },
        { name: "totalLatencyMs", unit: "ms", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 3,
        maximum: 3,
        premises:
          "instrument v2: the unified speed probe repeats 3 times per configuration for stdDev; structural probes run once",
      },
      costPerRun: {
        ceilingUsd: 60,
        premises:
          "shared `npm run compare` sweep (instrument v2, 47 configs); estimated ~$10 cold / ~$6 warm-started; run --estimate before each real run",
      },
      accumulates:
        "per-config HistoryPoint series for each speed metric, one point per dated frame; charts connect same-instrument-version points only",
    },
  },
  {
    id: "accuracy",
    artifactBase: "llm-accuracy-comparison",
    npmScript: "npm run research -- accuracy --real",
    source: {
      text: "LLM output accuracy",
      docsPath: "docs/research-reports/llm-accuracy-comparison.md",
      summary:
        "JSON-schema limits, length-instruction following, and information accuracy.",
    },
    japanese: {
      text: "出力精度",
      docsPath: "docs/research-reports/llm-accuracy-comparison.insights.ja.md",
      summary: "JSON スキーマ制約、長さ指示追従、情報精度の比較。",
    },
    dataPath: "docs/research-reports/llm-accuracy-comparison.data.json",
    qmuSlug: "llm-accuracy-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a major model release",
      subjects:
        "models in the foundation-models catalog, at most 3 efforts per model (lowest, intermediate, highest)",
      metrics: [
        {
          name: "maxSchemaDepth",
          unit: "levels",
          direction: "higher-is-better",
        },
        {
          name: "maxSchemaBreadth",
          unit: "properties",
          direction: "higher-is-better",
        },
        {
          name: "lengthAccuracy",
          unit: "ratio",
          direction: "higher-is-better",
        },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 1,
        premises:
          "instrument v2: schema boundary search and batched information probe run once per configuration (near-deterministic structural measurements); length accuracy repeats with the speed probe",
      },
      costPerRun: {
        ceilingUsd: 60,
        premises:
          "shared `npm run compare` sweep (instrument v2, 47 configs); estimated ~$10 cold / ~$6 warm-started; run --estimate before each real run",
      },
      accumulates:
        "per-config HistoryPoint series for each accuracy metric, one point per dated frame; charts connect same-instrument-version points only",
    },
  },
  {
    id: "availability",
    artifactBase: "llm-availability",
    npmScript: "npm run research -- availability --real",
    source: {
      text: "LLM API availability",
      docsPath: "docs/research-reports/llm-availability.md",
      summary:
        "Status-page incident history and derived 30/90-day availability trends.",
    },
    japanese: {
      text: "API可用性",
      docsPath: "docs/research-reports/llm-availability.insights.ja.md",
      summary: "公開ステータスページ由来のインシデント履歴と 30/90 日の傾向。",
    },
    dataPath: "docs/research-reports/llm-availability.data.json",
    qmuSlug: "llm-availability",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a provider incident",
      subjects: "public provider status pages (Anthropic, OpenAI, Google, xAI)",
      metrics: [
        { name: "incidentTotal", unit: "count", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 1,
        premises: "one observation reads each provider's public status history",
      },
      costPerRun: {
        ceilingUsd: 5,
        premises:
          "status-page fetches are free; cost is one LLM extraction call per provider; run availability:estimate first",
      },
      accumulates:
        "per-provider incident history in docs/research-reports/availability-history/*.json with 30/90-day windows",
    },
  },
  {
    id: "ocr",
    artifactBase: "ocr-comparison",
    npmScript: "npm run research -- ocr --real",
    source: {
      text: "OCR capability comparison",
      docsPath: "docs/research-reports/ocr-comparison.md",
      summary:
        "CER/WER and structured field extraction over synthetic documents.",
    },
    japanese: {
      text: "OCR能力",
      docsPath: "docs/research-reports/ocr-comparison.insights.ja.md",
      summary: "視覚対応モデルの文字起こしと構造化抽出の比較。",
    },
    dataPath: "docs/research-reports/ocr-comparison.data.json",
    qmuSlug: "ocr-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a vision-capable model release",
      subjects: "vision-capable models in the foundation-models catalog",
      metrics: [
        {
          name: "characterErrorRate",
          unit: "ratio",
          direction: "lower-is-better",
        },
        { name: "wordErrorRate", unit: "ratio", direction: "lower-is-better" },
        { name: "fieldAccuracy", unit: "ratio", direction: "higher-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 20,
        premises:
          "provider token/image charges over the synthetic document set; no measured baseline yet; run ocr:estimate first",
      },
      accumulates:
        "per-model HistoryPoint series for each OCR metric, one point per dated frame",
    },
  },
  {
    id: "rag",
    artifactBase: "rag-benchmark",
    npmScript: "npm run research -- rag --real",
    source: {
      text: "RAG vector store benchmark",
      docsPath: "docs/research-reports/rag-benchmark.md",
      summary:
        "Retrieval quality, ingestion time, query latency, cost, and operational constraints.",
    },
    japanese: {
      text: "ベクトルDBの比較",
      docsPath: "docs/research-reports/rag-benchmark.insights.ja.md",
      summary:
        "検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約の比較。",
    },
    dataPath: "docs/research-reports/rag-benchmark.data.json",
    qmuSlug: "rag-benchmark",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a new vector-store backend or embedding model",
      subjects: "vector-store backends behind the shared RAG harness",
      metrics: [
        { name: "recallAtK", unit: "ratio", direction: "higher-is-better" },
        { name: "ndcgAtK", unit: "ratio", direction: "higher-is-better" },
        {
          name: "queryLatencyP50Ms",
          unit: "ms",
          direction: "lower-is-better",
        },
        { name: "costUsd", unit: "USD", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 5,
        premises:
          "retrieval quality is deterministic per dataset; five trials bound operational latency variance",
      },
      costPerRun: {
        ceilingUsd: 10,
        premises:
          "local compute plus managed-backend usage when credentials are configured; run rag:estimate first",
      },
      accumulates:
        "per-backend HistoryPoint series for retrieval and latency metrics, one point per dated frame",
    },
  },
  {
    id: "image-generation",
    artifactBase: "image-generation-comparison",
    npmScript: "npm run research -- image-generation --real",
    source: {
      text: "Image generation",
      docsPath: "docs/research-reports/image-generation-comparison.md",
      summary:
        "Generation latency, per-image cost, rubric-checked prompt adherence, and exact-text rendering.",
    },
    japanese: {
      text: "画像生成",
      docsPath:
        "docs/research-reports/image-generation-comparison.insights.ja.md",
      summary:
        "生成レイテンシ、画像単価、機械検証可能なプロンプト追従、正確なテキスト描画の比較。",
    },
    dataPath: "docs/research-reports/image-generation-comparison.data.json",
    qmuSlug: "image-generation",
    design: {
      cadence: "monthly",
      offCadenceTrigger:
        "an image-generation model release or retirement at a covered provider",
      subjects:
        "API-accessible image-generation models in the curated image-model registry (OpenAI, Google, xAI; Anthropic exposes no image-generation API and is recorded as not applicable)",
      metrics: [
        {
          name: "generationLatencyMs",
          unit: "ms",
          direction: "lower-is-better",
        },
        { name: "costPerImageUsd", unit: "USD", direction: "reference" },
        {
          name: "promptAdherence",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "textRenderAccuracy",
          unit: "ratio",
          direction: "higher-is-better",
        },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 20,
        premises:
          "3 models × 8 prompts × 1–3 repetitions at $0.02–$0.039 catalog per image plus one vision-judge read per image; run `research -- image-generation --estimate` first",
      },
      accumulates:
        "per-model HistoryPoint series for latency, adherence, and text accuracy, one point per dated frame; charts connect same-manifest-version points only",
    },
  },
  {
    id: "speech",
    artifactBase: "speech-comparison",
    npmScript: "npm run research -- speech --real",
    source: {
      text: "Speech (TTS / STT / STS)",
      docsPath: "docs/research-reports/speech-comparison.md",
      summary:
        "Text-to-speech intelligibility & latency, speech-to-text word accuracy & latency, per-unit cost, and speech-to-speech realtime capability.",
    },
    japanese: {
      text: "音声 (TTS/STT/STS)",
      docsPath: "docs/research-reports/speech-comparison.insights.ja.md",
      summary:
        "音声合成の明瞭度とレイテンシ、音声認識の単語精度とレイテンシ、単価、リアルタイム音声対話の対応状況の比較。",
    },
    dataPath: "docs/research-reports/speech-comparison.data.json",
    qmuSlug: "speech-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger:
        "a TTS/STT model release or price change at a covered provider",
      subjects:
        "API-accessible speech models in the curated speech registry (OpenAI, ElevenLabs, Google, Amazon, Deepgram, AssemblyAI for TTS/STT; OpenAI, Google, AWS, xAI cataloged for STS; Anthropic exposes no speech API and is recorded as not applicable)",
      metrics: [
        { name: "latencyMs", unit: "ms", direction: "lower-is-better" },
        {
          name: "ttsIntelligibility",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "sttWordAccuracy",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "ttsPricePer1MCharsUsd",
          unit: "USD/1M chars",
          direction: "reference",
        },
        {
          name: "sttPricePerMinuteUsd",
          unit: "USD/audio-minute",
          direction: "reference",
        },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 10,
        premises:
          "TTS billed per character plus one STT-judge read of each synthesized clip; STT billed per audio minute; the 3-utterance manifest estimates ~$0.04/trial; run `research -- speech --estimate` first",
      },
      accumulates:
        "per-subject HistoryPoint series for latency, TTS intelligibility, and STT word accuracy, one point per dated frame; charts connect same-manifest-version points only",
    },
  },
  {
    id: "computer-use",
    artifactBase: "computer-use-comparison",
    npmScript: "npm run research -- computer-use --real",
    source: {
      text: "Computer use",
      docsPath: "docs/research-reports/computer-use-comparison.md",
      summary:
        "Task success, steps, latency, wall-clock, and per-task cost for API-native computer-use agents over a pinned browser-task suite, one fixed Playwright harness.",
    },
    japanese: {
      text: "コンピュータ操作",
      docsPath: "docs/research-reports/computer-use-comparison.insights.ja.md",
      summary:
        "API ネイティブなコンピュータ操作エージェントの、固定 Playwright ハーネス上での固定ブラウザタスク群に対するタスク成功率・手数・レイテンシ・実時間・タスク単価の比較。",
    },
    dataPath: "docs/research-reports/computer-use-comparison.data.json",
    qmuSlug: "computer-use",
    design: {
      cadence: "quarterly",
      offCadenceTrigger:
        "a new or updated computer-use model/tool at a covered provider (Anthropic, OpenAI, Google)",
      subjects:
        "API-native computer-use tools, one config per provider (Anthropic computer_20251124 on Claude Sonnet 5, OpenAI computer on computer-use-preview, Google computer_use on Gemini 2.5 Computer Use), all driven through one fixed Playwright harness; xAI exposes no computer-use tool and is recorded as not applicable",
      metrics: [
        {
          name: "taskSuccessRate",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "stepsToComplete",
          unit: "actions",
          direction: "lower-is-better",
        },
        {
          name: "latencyPerActionMs",
          unit: "ms",
          direction: "lower-is-better",
        },
        {
          name: "wallClockPerTaskMs",
          unit: "ms",
          direction: "lower-is-better",
        },
        { name: "costPerTaskUsd", unit: "USD", direction: "lower-is-better" },
        { name: "recoveryRate", unit: "ratio", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev, but each repetition re-pays the full multi-turn screenshot cost",
      },
      costPerRun: {
        ceilingUsd: 40,
        premises:
          "3 subjects × 8 tasks × 1–3 repetitions, ~15 screenshot-dominated turns per task at each model's token rates; run `research -- computer-use --estimate` first",
      },
      accumulates:
        "per-subject HistoryPoint series for success rate, wall-clock, and cost per task, one point per dated frame; charts connect same-suite-version, same-harness points only",
    },
  },
  {
    id: "svg-generation",
    artifactBase: "svg-generation-comparison",
    npmScript: "npm run research -- svg-generation --real",
    source: {
      text: "SVG generation",
      docsPath: "docs/research-reports/svg-generation-comparison.md",
      summary:
        "Render validity, prompt fidelity (rasterize + fixed vision judge), path complexity, SMIL/CSS animation presence, generation latency, and token cost of frontier LLMs generating SVG.",
    },
    japanese: {
      text: "SVG生成",
      docsPath:
        "docs/research-reports/svg-generation-comparison.insights.ja.md",
      summary:
        "フロンティアLLMによるSVG生成の描画妥当性、プロンプト忠実度（ラスタライズ＋固定ビジョン判定）、パス複雑度、SMIL/CSSアニメーションの有無、生成レイテンシ、トークンコストの比較。",
    },
    dataPath: "docs/research-reports/svg-generation-comparison.data.json",
    qmuSlug: "svg-generation",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a frontier text-model release at a covered provider",
      subjects:
        "one text flagship per provider from the foundation-models catalog (Claude Opus 4.8, GPT-5.5, Gemini 3.1 Pro, Grok 4.3); SVG is emitted through each provider's completion API, so no provider is a non-subject",
      metrics: [
        {
          name: "renderValidity",
          unit: "ratio",
          direction: "higher-is-better",
        },
        { name: "pathComplexity", unit: "count", direction: "reference" },
        {
          name: "animationPresence",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "promptFidelity",
          unit: "ratio",
          direction: "higher-is-better",
        },
        {
          name: "generationLatencyMs",
          unit: "ms",
          direction: "lower-is-better",
        },
        {
          name: "outputTokenCostUsd",
          unit: "USD",
          direction: "lower-is-better",
        },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 5,
        premises:
          "4 models × 5 prompts × 1–3 repetitions at a few hundred output tokens per SVG at catalog token prices, plus one fixed-vision-judge read per generated SVG; run `research -- svg-generation --estimate` first",
      },
      accumulates:
        "per-model HistoryPoint series for render validity, prompt fidelity, animation presence, and mean token cost, one point per dated frame; charts connect same-manifest-version points only",
    },
  },
  {
    id: "agent-vm",
    artifactBase: "agent-vm-comparison",
    npmScript: "npm run research -- agent-vm --real",
    source: {
      text: "Agent VM / sandbox comparison",
      docsPath: "docs/research-reports/agent-vm-comparison.md",
      summary:
        "Isolation model, published price, capability envelope, and probed cold-start latency and fixed-task cost of the sandbox / microVM platforms agents run untrusted code in.",
    },
    japanese: {
      text: "エージェントVM/サンドボックス",
      docsPath: "docs/research-reports/agent-vm-comparison.insights.ja.md",
      summary:
        "エージェントが untrusted コードを実行するサンドボックス／microVM 基盤の分離モデル、公表価格、機能エンベロープ、実測コールドスタートと固定タスクコストの比較。",
    },
    dataPath: "docs/research-reports/agent-vm-comparison.data.json",
    qmuSlug: "agent-vm-comparison",
    design: {
      cadence: "quarterly (first two validation trials monthly)",
      offCadenceTrigger:
        "a new provider entering the compared set, a published pricing change at a covered provider, or a new isolation primitive at a covered provider",
      subjects:
        "the eight sandbox/microVM providers in the curated agent-vm registry (AWS Lambda microVMs, Fly.io Machines, E2B, Modal, Daytona, Cloudflare Containers/Sandbox SDK, Vercel Sandbox, Northflank Sandboxes); a provider without a probe adapter or credential stays catalog-only for that trial",
      metrics: [
        { name: "isolationModel", unit: "category", direction: "reference" },
        {
          name: "publishedVcpuHourUsd",
          unit: "USD/vCPU-hr",
          direction: "lower-is-better",
        },
        {
          name: "publishedGbHourUsd",
          unit: "USD/GB-hr",
          direction: "lower-is-better",
        },
        {
          name: "billingGranularity",
          unit: "category",
          direction: "reference",
        },
        {
          name: "maxRuntimeSeconds",
          unit: "seconds",
          direction: "higher-is-better",
        },
        { name: "snapshotResume", unit: "capability", direction: "reference" },
        {
          name: "filesystemPersistence",
          unit: "category",
          direction: "reference",
        },
        { name: "networkEgress", unit: "category", direction: "reference" },
        { name: "gpuAvailable", unit: "capability", direction: "reference" },
        { name: "coldStartMsP50", unit: "ms", direction: "lower-is-better" },
        { name: "coldStartMsP95", unit: "ms", direction: "lower-is-better" },
        { name: "warmReuseMs", unit: "ms", direction: "lower-is-better" },
        {
          name: "fixedTaskWallClockMs",
          unit: "ms",
          direction: "lower-is-better",
        },
        { name: "measuredCostUsd", unit: "USD", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 5,
        maximum: 20,
        premises:
          "8 providers × 5–20 cold-start repetitions + 1 warm reuse + 1 fixed CPU task each; more repetitions narrow the cold-start p50/p95 variance (reported as stdDev) but multiply the boot count and any per-boot minimum charge",
      },
      costPerRun: {
        ceilingUsd: 8,
        premises:
          "compute-seconds over short tasks at each provider's published rate — $1–$8 per trial depending on repetitions and per-boot minimums; run `research -- agent-vm --estimate` before every real run",
      },
      accumulates:
        "per-provider HistoryPoint series for coldStartMsP50 and publishedVcpuHourUsd, one point per dated trial; charts connect same-instrument-version points only",
    },
  },
];

/**
 * Slugs that were once published to qmu-co-jp but have since been retired from
 * the published set. The publish ticket instructs qmu-co-jp to DELETE these
 * copies (Japanese and English), so an unpublish here propagates instead of
 * leaving a stale page on the corporate site.
 */
export const retiredQmuSlugs: ReadonlyArray<string> = ["llm-benchmark"];

/**
 * The pages a dated trial frame is copied from. For a snapshot topic the full
 * trial report lives at `report.*` (the sidebar page is the compact snapshot);
 * otherwise the sidebar page itself is the report.
 */
export const reportFrameSources = (
  topic: ResearchSiteTopic,
): Readonly<{ source: string; japanese: string }> => ({
  source: topic.report?.sourcePath ?? topic.source.docsPath,
  japanese: topic.report?.japanesePath ?? topic.japanese.docsPath,
});

export const internalResearchSources = [
  // The original pipeline seed/self-test (packages/tech TEMPLATE proof). It
  // stays runnable and CI-exercised (`npm run benchmark:fixture`) but was
  // judged not sufficient for publication (owner, 2026-07-13), so it is an
  // internal source: off the sidebar, indexes, and the qmu copy set.
  {
    id: "llm-benchmark",
    artifactBase: "llm-benchmark",
    npmScript: "npm run benchmark",
    sourceForTopicIds: [],
    dataPaths: [],
    sideMarkdownPaths: [
      "docs/research-reports/llm-benchmark.md",
      "docs/research-reports/llm-benchmark.ja.md",
    ],
  },
  {
    id: "llm-model-comparison",
    artifactBase: "llm-model-comparison",
    npmScript: "npm run compare",
    sourceForTopicIds: ["speed", "accuracy"],
    dataPaths: [
      "docs/research-reports/llm-model-comparison.data.json",
      "docs/research-reports/llm-model-comparison.real.data.json",
      "docs/research-reports/llm-model-comparison.history.json",
    ],
    sideMarkdownPaths: [
      "docs/research-reports/llm-model-comparison.fixture.md",
      "docs/research-reports/llm-model-comparison.real.md",
    ],
  },
] satisfies ReadonlyArray<InternalResearchSource>;

// Backward-compatible name used by older entrypoints. It intentionally exposes
// only published topics, never internal measurement sources.
export const researchSiteTopics = publishedResearchTopics;

export const findPublishedResearchTopic = (
  id: string,
): ResearchSiteTopic | undefined =>
  publishedResearchTopics.find((topic) => topic.id === id);

export const findInternalResearchSource = (
  id: string,
): InternalResearchSource | undefined =>
  internalResearchSources.find((source) => source.id === id);

export const sourceResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.source,
  ...publishedResearchTopics.map((topic) => ({
    text: topic.source.text,
    link: docsLink(topic.source.docsPath),
  })),
  historyOverview.source,
];

export const japaneseResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.japanese,
  ...publishedResearchTopics.map((topic) => ({
    text: topic.japanese.text,
    link: docsLink(topic.japanese.docsPath),
  })),
  historyOverview.japanese,
];

export const publishSlugs = (): ReadonlyArray<string> =>
  publishedResearchTopics.map((topic) =>
    stripMarkdown(topic.japanese.docsPath).replace(/^docs\//, ""),
  );

export type PublishPlanEntry = Readonly<{
  sourceSlug: string;
  destinationSlug: string;
}>;

export const publishPlan = (): ReadonlyArray<PublishPlanEntry> =>
  publishedResearchTopics.map((topic) => ({
    sourceSlug: stripMarkdown(topic.japanese.docsPath).replace(/^docs\//, ""),
    destinationSlug: topic.qmuSlug,
  }));

/**
 * D1 (owner, 2026-07-13): every dated survey is published to qmu-co-jp, so a
 * current article's 過去の調査 links resolve there. Each frame's Japanese
 * article is copied under a MIRRORED path (`history/<topic>/<ts>/<base>.ja`) —
 * the same relative path the current page links — so the links work unchanged
 * once qmu-co-jp holds the frames beside the topic pages. Pure: the caller
 * supplies the frames it read from disk.
 */
export const framePublishPlan = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ReadonlyArray<PublishPlanEntry> =>
  frames
    .filter((frame) => frame.japanesePath !== undefined)
    .map((frame) => {
      const japanesePath = frame.japanesePath as string;
      return {
        // Source: docs-relative, no `docs/` prefix, no `.md` (the publish
        // script's slug form) — e.g. research-reports/history/speed/<ts>/llm-speed-comparison.ja
        sourceSlug: stripMarkdown(japanesePath).replace(/^docs\//, ""),
        // Destination mirrors the in-article link target under the topic pages.
        destinationSlug: stripMarkdown(japanesePath).replace(
          /^docs\/research-reports\//,
          "",
        ),
      };
    });

/**
 * The English counterpart of `framePublishPlan`: each dated English survey,
 * mirrored under the qmu-co-jp English section so the English current pages'
 * past-survey links resolve there too.
 */
export const englishFramePublishPlan = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ReadonlyArray<PublishPlanEntry> =>
  frames
    .filter((frame) => frame.sourcePath !== undefined)
    .map((frame) => {
      const sourcePath = frame.sourcePath as string;
      return {
        sourceSlug: stripMarkdown(sourcePath).replace(/^docs\//, ""),
        destinationSlug: stripMarkdown(sourcePath).replace(
          /^docs\/research-reports\//,
          "",
        ),
      };
    });

export const historyStamp = (generatedAt: string): string =>
  generatedAt.replace(/[:.]/g, "-");

export type ReportFrameKind = "source" | "data" | "japanese";

export const historyPathFor = (
  topic: ResearchSiteTopic,
  generatedAt: string,
  kind: ReportFrameKind,
): string => {
  const stamp = historyStamp(generatedAt);
  const directory = `docs/research-reports/history/${topic.id}/${stamp}`;
  if (kind === "source") return `${directory}/${topic.artifactBase}.md`;
  if (kind === "japanese") return `${directory}/${topic.artifactBase}.ja.md`;
  return `${directory}/${topic.artifactBase}.data.json`;
};

export type ResearchHistoryFrame = Readonly<{
  topicId: string;
  generatedAt: string;
  sourcePath?: string;
  japanesePath?: string;
  dataPath?: string;
}>;

const sourceHistoryLink = (path: string): string => {
  const relative = path.replace(/^docs\/research-reports\//, "");
  return `./${path.endsWith(".md") ? stripMarkdown(relative) : relative}`;
};

const japaneseHistoryLink = (path: string): string => {
  const relative = path.replace(/^docs\//, "");
  return `../${path.endsWith(".md") ? stripMarkdown(relative) : relative}`;
};

const sortHistoryFrames = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ReadonlyArray<ResearchHistoryFrame> =>
  [...frames].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt),
  );

const renderHistoryFrame = (
  frame: ResearchHistoryFrame,
  linkFor: (path: string) => string,
): string => {
  const links = [
    frame.sourcePath === undefined
      ? undefined
      : `[English](${linkFor(frame.sourcePath)})`,
    frame.japanesePath === undefined
      ? undefined
      : `[Japanese](${linkFor(frame.japanesePath)})`,
    frame.dataPath === undefined
      ? undefined
      : `[data.json](${linkFor(frame.dataPath)})`,
  ].filter((link): link is string => link !== undefined);

  return `- ${frame.generatedAt}: ${links.join(" · ")}`;
};

const renderHistorySections = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
  linkFor: (path: string) => string,
  titleFor: (topic: ResearchSiteTopic) => string,
  emptyText: string,
): string =>
  publishedResearchTopics
    .map((topic) => {
      const topicFrames = sortHistoryFrames(
        frames.filter((frame) => frame.topicId === topic.id),
      );
      const body =
        topicFrames.length === 0
          ? emptyText
          : topicFrames
              .map((frame) => renderHistoryFrame(frame, linkFor))
              .join("\n");
      return `### ${titleFor(topic)}

${body}`;
    })
    .join("\n\n");

export const renderSourceIndex = (): string => `---
title: ${EN_RESEARCH_TITLE}
description: English reports, data artifacts, and history kept as reproducible source material.
---

# ${EN_RESEARCH_TITLE}

English reports, data artifacts, and history are kept here as reproducible
source material. The public reading line for the Japanese canonical articles is
[${JA_RESEARCH_TITLE}](../llm-foundation/).

These are organized by research topic. Current reports and data artifacts are
the reproducible source for each topic; keyless fixture outputs remain available
as self-tests but do not replace owner-triggered real measurements on the public
reading path.

Past generated frames are listed in [History](./history).

**Topics**

${publishedResearchTopics
  .map(
    (topic) =>
      `- [${topic.source.text}](./${stripMarkdown(topic.source.docsPath).replace("docs/research-reports/", "")}) — ${topic.source.summary}`,
  )
  .join("\n")}

To add a study, see the \`TEMPLATE.md\` in the relevant package under \`packages/\`.
`;

export const renderSourceHistoryIndex = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): string => `---
title: ${EN_RESEARCH_TITLE} History
description: Dated English, Japanese, and data frames for shipped research reports.
---

# History

This page lists dated report frames committed under
\`docs/research-reports/history/\`. Each frame keeps the English source report,
Japanese translation, and \`data.json\` artifact when available.

The topic order matches [${EN_RESEARCH_TITLE}](./) and
[${JA_RESEARCH_TITLE}](../llm-foundation/).

## Frames

${renderHistorySections(
  frames,
  sourceHistoryLink,
  (topic) => topic.source.text,
  "No dated frames have been archived yet.",
)}
`;

export const renderJapaneseIndex = (): string => `---
title: ${JA_RESEARCH_TITLE}
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# ${JA_RESEARCH_TITLE}

このページは [${EN_RESEARCH_TITLE}](../research-reports/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、\`data.json\`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。

過去の生成フレームは [History](./history) に残す。

## トピック

${publishedResearchTopics
  .map(
    (
      topic,
    ) => `### [${topic.japanese.text}](${docsLink(topic.japanese.docsPath)})

${topic.japanese.summary}
英語ソースは [${topic.source.text}](${docsLink(topic.source.docsPath)})。`,
  )
  .join("\n\n")}

## provenance について

日本語ページは、英語側のトピックと同じ順序で配置する。現在の \`*.insights.ja.md\`
ページは英語 insights を日本語へ翻訳した生成物であり、frontmatter に source
artifact、source commit、translation model、generated timestamp を保持する。
全文レポートの直接翻訳と日付別履歴は、report-history pipeline が同じ topic metadata
から生成する。
`;

export const renderJapaneseHistoryIndex = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): string => `---
title: ${JA_RESEARCH_TITLE} History
description: 生成日ごとの英語ソース、日本語翻訳、data.json の履歴。
---

# History

このページは、\`docs/research-reports/history/\` にコミットされた日付別の
調査フレームを一覧する。各フレームには、利用できる場合に英語ソース、
日本語翻訳、\`data.json\` を残す。

トピック順は [${EN_RESEARCH_TITLE}](../research-reports/) と
[${JA_RESEARCH_TITLE}](./) に合わせる。

## フレーム

${renderHistorySections(
  frames,
  japaneseHistoryLink,
  (topic) => topic.japanese.text,
  "まだ日付別フレームは保存されていない。",
)}
`;

export const renderQmuTicketPayload = (
  frames: ReadonlyArray<ResearchHistoryFrame> = [],
): string => {
  const framePlan = framePublishPlan(frames);
  const englishFramePlan = englishFramePublishPlan(frames);
  return [
    "# Reflect LLMs Research reports",
    "",
    `Sidebar group label: the qmu-co-jp navigation group holding these articles must read 「${QMU_RESEARCH_GROUP_LABEL}」 (the <テーマ>について convention).`,
    "",
    "Copy the following English and Japanese report files in order, preserving this order in the qmu-co-jp navigation and indexes. Each article's sidebar label and page title must both use the title given here (it equals the source page's frontmatter title):",
    "",
    "English reports:",
    "",
    ...publishedResearchTopics.map(
      (topic, index) =>
        `${index + 1}. ${topic.source.docsPath} -> docs/en/llm-foundation-research/${topic.qmuSlug}.md (title: ${topic.source.text})`,
    ),
    "",
    "Japanese reports:",
    "",
    ...publishedResearchTopics.map(
      (topic, index) =>
        `${index + 1}. ${topic.japanese.docsPath} -> docs/llm-foundation-research/${topic.qmuSlug}.md (title: ${topic.japanese.text})`,
    ),
    "",
    ...(retiredQmuSlugs.length === 0
      ? []
      : [
          "Delete the following retired copies (both languages) and remove them from navigation and indexes:",
          "",
          ...retiredQmuSlugs.flatMap((slug) => [
            `- docs/llm-foundation-research/${slug}.md`,
            `- docs/en/llm-foundation-research/${slug}.md`,
          ]),
          "",
        ]),
    ...(framePlan.length === 0
      ? []
      : [
          `Past-survey articles (${framePlan.length} Japanese): copy each dated Japanese survey under the mirrored path below, so the 過去の調査 links in the Japanese current pages resolve on qmu-co-jp. These are the earlier runs of each topic, kept as their own articles:`,
          "",
          ...framePlan.map(
            (entry) =>
              `- docs/${entry.sourceSlug}.md -> docs/llm-foundation-research/${entry.destinationSlug}.md`,
          ),
          "",
        ]),
    ...(englishFramePlan.length === 0
      ? []
      : [
          `Past-survey articles (${englishFramePlan.length} English): copy each dated English survey under the mirrored path below, so the past-survey links in the English current pages resolve in the English section:`,
          "",
          ...englishFramePlan.map(
            (entry) =>
              `- docs/${entry.sourceSlug}.md -> docs/en/llm-foundation-research/${entry.destinationSlug}.md`,
          ),
          "",
        ]),
    "Update both qmu-co-jp index/table-of-contents entries from the same order.",
  ].join("\n");
};
