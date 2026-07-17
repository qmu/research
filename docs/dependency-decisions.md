# Dependency decisions

Per the vendor-neutrality policy, every external dependency (library, SDK, SaaS,
managed infrastructure, dataset) is recorded here before adoption. Implement it
ourselves first; depend only when the value clearly exceeds the cost of exit.

## Template

```
### <dependency>

- **Reason**: why we need it; what we considered implementing ourselves.
- **Assessment**:
  - License: <license, and compatibility with this MIT public repo>
  - Reputation: <maintainer, adoption, security history>
  - Development status: <active? release cadence?>
  - Sustainability: <bus factor, funding, governance>
- **Monitoring**: how we watch for problems (Dependabot, advisories).
- **Exit strategy**: how we replace it; what the anti-corruption layer isolates.
```

## Decisions

### typescript, @types/node, tsx, vitest, eslint, typescript-eslint, prettier

- **Reason**: Baseline TypeScript toolchain for the research packages; building
  a type checker, test runner, or formatter ourselves is out of scope.
- **Assessment**:
  - License: MIT / Apache-2.0 — compatible with this MIT repo.
  - Reputation: De-facto standard tooling, broad adoption, active security response.
  - Development status: Actively maintained.
  - Sustainability: Backed by Microsoft (TypeScript), the OpenJS Foundation, and
    well-funded OSS projects.
- **Monitoring**: Dependabot (`.github/dependabot.yml`), `npm audit` in CI.
- **Exit strategy**: Standard, swappable tooling; no domain logic depends on them.

### @anthropic-ai/sdk (packages/tech)

- **Reason**: The `llm-benchmark` topic calls the Anthropic Messages API. Implementing an HTTP client by hand would duplicate ret/streaming/typing the SDK provides; the dependency is isolated behind `packages/tech/src/vendors/llm/`.
- **Assessment**:
  - License: MIT — compatible with this MIT repo.
  - Reputation: Official Anthropic SDK; actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by Anthropic.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `LlmClient` anti-corruption layer (`generateAnswer`); swapping providers means adding another `src/vendors/llm/` implementation, not touching benchmark logic.

### openai (packages/tech)

- **Reason**: The `llm-model-comparison` topic measures OpenAI models live. The official SDK provides typed request/response and usage shapes; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/openai.ts` (Chat Completions) and `packages/tech/src/vendors/llm/openai-responses.ts` (the Responses API, for the `-codex` coding models). The **same SDK also fronts the xAI OpenAI-compatible endpoint** (the Grok lineup — `grok-4.3`, the `grok-4.20-0309` reasoning/non-reasoning pair, and the `grok-build-0.1` coding model) via a base-URL variant in `vendors/llm/xai.ts` — no new dependency is taken on for xAI; only a base URL differs. The `rag-benchmark` topic reuses the **same already-present SDK** for two more surfaces — OpenAI's managed **vector store / File Search** (isolated behind `packages/tech/src/vendors/vectorstore/openai.ts`) and the **embeddings** endpoint (`text-embedding-3-small`, behind `packages/tech/src/vendors/embedding/openai.ts`, the fixed embedding for the self-managed store-isolated comparison). No new dependency is taken on; both ACLs implement domain ports (`VectorStore` / `EmbeddingClient`).
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official OpenAI SDK; broad adoption, actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by OpenAI.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `CompletionClient` contract; the SDK's usage shape is normalized to `Completion.outputTokens` in `vendors/llm/usage.ts`, so dropping the provider is a one-file change with no domain impact.

### @google/genai (packages/tech)

- **Reason**: The `llm-model-comparison` topic measures Google Gemini models live. The official SDK provides typed access and usage metadata; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/google.ts`.
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official Google Gen AI SDK; actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by Google.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `CompletionClient` contract; `usageMetadata.candidatesTokenCount` is normalized to `Completion.outputTokens` in `vendors/llm/usage.ts`, so dropping the provider is a one-file change with no domain impact.

### sqlite-vec, better-sqlite3, @types/better-sqlite3 (packages/tech)

- **Reason**: The `rag-benchmark` topic needs a local, keyless vector-store
  baseline before any managed retrieval provider is measured. Implementing an
  approximate-nearest-neighbor index and SQLite binding ourselves would distract
  from the benchmark objective. `sqlite-vec` provides the vector extension,
  `better-sqlite3` provides an embedded database driver, and
  `@types/better-sqlite3` keeps the driver boundary typed. All access is isolated
  behind `packages/tech/src/vendors/vectorstore/sqlite-vec.ts`.
- **Assessment**:
  - License: `sqlite-vec` is MIT OR Apache-2.0, `better-sqlite3` is MIT, and
    `@types/better-sqlite3` follows the DefinitelyTyped MIT license;
    compatible with this MIT repo.
  - Reputation: `sqlite-vec` is a focused SQLite extension by Alex Garcia;
    `better-sqlite3` is widely adopted in Node.js projects.
  - Development status: `sqlite-vec` is young but actively released;
    `better-sqlite3` is mature and maintained.
  - Sustainability: The benchmark is protected by a `VectorStore`
    anti-corruption layer and keeps a deterministic fixture store for no-dependency
    test runs.
- **Monitoring**: Dependabot, `npm audit` in CI, and local benchmark fixture
  stability checks.
- **Exit strategy**: Replace only the `VectorStore` adapter and backend registry
  entry. Domain scoring, reports, and datasets do not depend on SQLite APIs.

### @aws-sdk/client-s3vectors (packages/tech)

- **Reason**: The `rag-benchmark` topic measures **AWS S3 Vectors** as a
  self-managed, fixed-embedding backend. The official AWS SDK v3 client provides
  typed commands for the vector bucket/index/put/query surface; hand-rolling a
  SigV4 HTTP client would duplicate that. All access is isolated behind
  `packages/tech/src/vendors/vectorstore/s3-vectors.ts`, which implements the
  domain `VectorStore` port. Pinned to `3.1066.0` — the newest release that
  clears the repo's `min-release-age=7` supply-chain gate (`.npmrc`); the S3
  Vectors client is new and its later releases were younger than that floor when
  this landed.
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official AWS SDK for JavaScript v3, vendored by AWS.
  - Development status: Active; the S3 Vectors client tracks a newer AWS service,
    so treat ids/limits as correct-as-of-source and re-verify against the live
    API when bumping.
  - Sustainability: Isolated behind the `VectorStore` ACL with a deterministic
    fixture fallback; a credential-absent or region-unavailable run renders the
    card `fixtured` / `error`, never faked.
- **Monitoring**: Dependabot, `npm audit` in CI (`--audit-level=high`), and the
  benchmark fixture stability check.
- **Exit strategy**: Replace only the `VectorStore` adapter and the `s3-vectors`
  registry card. Domain scoring, reports, and datasets do not depend on AWS APIs.

### Cloudflare Vectorize / AutoRAG / R2 REST (packages/tech) — no new dependency

- **Reason**: The `rag-benchmark` topic measures **Cloudflare Vectorize**
  (self-managed, fixed embedding) and **Cloudflare AutoRAG** (fully-managed).
  Both are reached over Cloudflare's REST API using the runtime's built-in
  `fetch` — **no SDK dependency is taken on**. Access is isolated behind
  `packages/tech/src/vendors/vectorstore/vectorize.ts` (Vectorize v2:
  create/upsert/query/delete index) and `.../autorag.ts` (AutoRAG: R2 bucket +
  object upload, instance create, sync, search), each implementing the domain
  `VectorStore` port. Auth is `CLOUDFLARE_ACCOUNT_ID` + an API token.
- **Assessment**:
  - License / dependency: none added — native `fetch` only.
  - Surface stability: these APIs are newer and move; ids/limits/pricing are
    cited correct-as-of-source (2026-07) and were verified live before wiring.
    Vectorize v2 requires index dimensions in `[32, 1536]` and its mutations are
    eventually consistent (~5-15s). AutoRAG indexes asynchronously (6-hour cycle
    / rate-limited force sync) and its R2 data-source binding is dashboard-
    provisioned, so a REST-only live run renders an honest `error`, never faked.
  - Sustainability: isolated behind the two `VectorStore` ACLs with a
    deterministic fixture fallback; a credential-absent run renders `fixtured`.
- **Monitoring**: `npm audit` in CI (no package added), and the benchmark
  fixture stability check.
- **Exit strategy**: Replace only the two `VectorStore` adapters and their
  registry cards. Domain scoring, reports, and datasets do not depend on
  Cloudflare APIs.

### Computer-use tools + Playwright harness (packages/tech) — no new dependency

- **Reason**: The `computer-use` topic measures the three API-native
  computer-use tools (Anthropic `computer_20251124`, OpenAI Responses `computer`,
  Google `computer_use`), each driven through **one fixed Playwright harness**
  (the repository's existing Playwright MCP plugin — the actuation/observation
  layer). The provider tools reuse the SDKs already taken on for other topics
  (`@anthropic-ai/sdk`, `openai`, `@google/genai`); **no new package is added**.
  Access is isolated behind the domain-neutral `ComputerUseClient` port
  (`packages/tech/src/vendors/llm/types.ts`), with adapters in
  `.../vendors/llm/computer-use.ts` and a keyless deterministic fixture in
  `.../vendors/llm/fixture.ts`.
- **Assessment**:
  - License / dependency: none added — reuses existing provider SDKs and the
    already-present Playwright MCP plugin.
  - Surface stability: computer-use tools are preview-stage and move; tool
    versions, model ids, and token prices are cited correct-as-of-source
    (2026-07) in `src/computer-use/models.ts`, isolated for one-line correction.
  - Sustainability: the real observe→think→act loop is a **gated follow-up**
    (owner-triggered real trial within the $40/trial ceiling); until it lands the
    adapters return an honest `error` row on a real run and the keyless fixture
    renders `fixtured`. CI never launches a browser or calls a provider.
- **Monitoring**: `npm audit` in CI (no package added), and the fixture stability
  / published-page guards.
- **Exit strategy**: Replace only the `ComputerUseClient` adapters and their
  registry cards. Domain scoring, the task suite, and reports do not depend on any
  provider tool or on Playwright.

### SciFact (BEIR) dataset — fetched, not committed, not a package

- **Reason**: The `rag-benchmark` real run needs a citable public IR dataset with
  qrels so retrieval quality (recall/nDCG/MRR) genuinely differentiates. SciFact
  (allenai/scifact, redistributed via BEIR) is used as a subset.
- **License**: SciFact is **CC BY-NC 2.0**. To stay clear of redistributing
  NC-licensed corpus text from this MIT repo, the **corpus text is never
  committed**. Only a manifest of selected query/document ids + qrels (facts) is
  committed at `packages/tech/src/rag-benchmark/domain/data/scifact-subset.manifest.json`.
  `scripts/fetch-scifact.sh` downloads the corpus into a **gitignored** cache
  (`packages/tech/.cache/`), and `domain/dataset.ts` filters it to the manifest at
  real-run time. The keyless CI path uses the repository-authored `scifact-mini`
  fixture instead, so no fetch or license surface touches CI.
- **Exit strategy**: The manifest + fetch script are self-contained; swapping in a
  different BEIR dataset is a manifest + loader change, no code elsewhere.

### TruthfulQA dataset — small manifest subset, not a package

- **Reason**: The `llm-model-comparison` real run needs a citable public factual
  QA dataset with reference answers so information accuracy can be scored by a
  deterministic exact-match/F1 scorer, not by an LLM judge. TruthfulQA is used as
  a small short-answer subset for the information-accuracy probe.
- **License**: TruthfulQA is **Apache-2.0**. The upstream repository states that
  `TruthfulQA.csv` contains the full benchmark questions and reference answers.
  Because the selected QA items are short and permissively licensed, this repo
  commits only a pinned subset manifest of question ids + question text +
  reference answers + accepted aliases + normalization rules at
  `packages/tech/src/llm-model-comparison/domain/data/truthfulqa-information-accuracy.manifest.json`.
  No large corpus text or generated model outputs are redistributed.
- **Exit strategy**: The manifest and scorer are self-contained; swapping in a
  different permissive factual-QA dataset is a manifest + prompt/scorer fixture
  change, no provider adapter change.

### QMU synthetic document OCR fixture — generated, not a package

- **Reason**: The `ocr-comparison` topic needs document images with pinned
  transcription text and structured-field ground truth before any article can
  report OCR metrics. A clean third-party real-image dataset was not adopted in
  this implementation, so the keyless path uses repository-authored synthetic
  receipt/invoice documents rendered deterministically from a committed manifest.
- **License**: MIT. The committed manifest at
  `packages/tech/src/ocr-comparison/domain/data/synthetic-document-ocr.manifest.json`
  contains only repository-authored ids, reference transcription text,
  structured-field ground truth, normalization rules, and rendering instructions.
  Images are generated at run time and no third-party document images or large
  OCR corpus files are committed. Future real-image OCR datasets must follow the
  SciFact pattern: commit only selected ids, reference text, field truth,
  normalization, and license metadata; fetch image bytes into a gitignored cache.
- **Exit strategy**: The manifest, renderer, and scorer are self-contained.
  Replacing the synthetic fixture with a permissive/public-domain real document
  OCR set is a manifest + fetch-loader change; the vision provider ACL and
  CER/WER/field scorers do not change.

### Deep-research provider endpoints — ACL defined, no SDK adopted yet

- **Reason**: The `deep-research` topic compares autonomous deep-research
  endpoints (OpenAI `o3-deep-research`, Perplexity `sonar-deep-research`, Gemini
  Deep Research, Grok DeepSearch, and an Anthropic build-your-own baseline). The
  keyless skeleton defines the anti-corruption port
  (`src/vendors/deep-research/types.ts`) and a deterministic fixture client only;
  **no new provider SDK is adopted in this ticket** — the fixture path uses no
  network and no external package.
- **Assessment**: Deferred. The real per-provider adapters (OpenAI Responses,
  Perplexity's OpenAI-compatible endpoint, Gemini's background Interactions API,
  Grok DeepSearch tool calls, the Anthropic `web_search` loop) and their SDK
  choices are introduced by the follow-on ticket
  `#deep-research-subject-vendors.md`, gated on proposal approval; each SDK gets
  its own decision entry here at that point, per the rule below.
- **Exit strategy**: All provider access is isolated behind the
  `DeepResearchClient` port; the domain (`src/deep-research/`) depends only on
  that shape, so swapping or dropping a provider is a `vendors/deep-research/`
  change with no domain impact.

### LLM credential abstraction (packages/tech) — no new dependency

- **Reason**: The `llm-model-comparison` entrypoint wired every provider's auth as
  a single `Record<Provider, string>` of API-key strings. AWS Bedrock (SigV4) and
  Google Vertex (GCP ADC) do not fit a single key, so before either adapter can be
  added the credential contract must generalize. A discriminated-union
  `Credential` (`apiKey | awsSigV4 | gcpAdc`) plus a declarative `CredentialSpec`
  and a pure `resolveCredential(spec, env)` now live in
  `packages/tech/src/vendors/llm/credentials.ts`. No new package is taken on — the
  union is plain data (region/ids/project strings); the AWS and Google auth SDKs
  will be added by their own adapter tickets, behind the vendors/ ACL, and are the
  only place those SDK types may appear.
- **Assessment**:
  - License: n/a (repository code, MIT).
  - Reputation / Development status / Sustainability: n/a (in-repo).
- **Monitoring**: n/a.
- **Exit strategy**: The credential union and resolver are self-contained and
  unit-tested (`credentials.test.ts`). Single-key providers narrow to their API
  key at the entrypoint via `requireApiKey`, so their adapters and tests are
  behaviourally unchanged; a missing credential resolves to `null` and preserves
  the keyless fixture fallback (`provenance: "fixtured"`). Adding or removing a
  backend is an edit to `CREDENTIAL_SPEC` / `CLIENT_FACTORY` plus one vendor
  adapter, with no change to the `CompletionClient` port.

### Perplexity Sonar backend (packages/tech) — no new dependency

- **Reason**: The IaaS-hosted-models mission adds Perplexity's search-grounded
  Sonar lineup as a comparison backend. Perplexity speaks the OpenAI Chat
  Completions protocol at `https://api.perplexity.ai`, so it is reached through the
  existing `createOpenAiCompatibleCompletionClient(model, key, baseURL)` with only
  the base URL swapped — the same pattern as the xAI backend. No new package is
  added; the single Perplexity-specific fact (the base URL) lives in
  `packages/tech/src/vendors/llm/perplexity.ts`.
- **Assessment**:
  - License: n/a (repository code, MIT). Uses the already-adopted `openai` SDK.
  - Reputation / Development status / Sustainability: n/a (in-repo wrapper).
- **Auth**: `PERPLEXITY_API_KEY`, resolved through the generalized credential
  contract (`apiKey` spec). Absent key → the keyless fixture fallback
  (`provenance: "fixtured"`), so CI stays green without a key.
- **Monitoring**: n/a.
- **Exit strategy**: Removing the backend is deleting `perplexity.ts`, its
  `CREDENTIAL_SPEC`/`CLIENT_FACTORY` entries, the `Provider` union member, and the
  Sonar cards in `models.ts`. Sonar's search grounding stays behind the ACL; the
  `CompletionClient` port is unchanged.

### @anthropic-ai/bedrock-sdk, @anthropic-ai/vertex-sdk (packages/tech)

- **Reason**: The IaaS-hosted-models mission measures Claude AS SERVED through the
  IaaS platforms enterprises actually consume it on — AWS Bedrock and Google
  Vertex AI. Both serve the Anthropic Messages API but authenticate differently
  from the first-party key (Bedrock: AWS SigV4; Vertex: GCP ADC), which is why the
  official Anthropic Bedrock/Vertex SDKs are adopted rather than hand-signing
  requests. Both wrap the already-adopted `@anthropic-ai/sdk` and expose the same
  `.messages` surface, so the completion-client wiring is shared
  (`vendors/llm/messages-completion.ts`) and only the client construction differs
  per transport (`vendors/llm/bedrock.ts`, `vendors/llm/vertex.ts`).
- **Assessment**:
  - License: MIT (same as `@anthropic-ai/sdk`) — compatible with this MIT repo.
  - Reputation: first-party Anthropic SDKs; same maintainer and release cadence as
    the core SDK already in use.
  - Development status / Sustainability: actively maintained alongside the core SDK.
- **Auth**: Bedrock resolves through the `awsSigV4` credential spec (AWS_REGION /
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / optional AWS_SESSION_TOKEN); Vertex
  through the `gcpAdc` spec (GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION plus
  ambient ADC). A missing/partial credential set resolves to `null` and falls back
  to the keyless fixture path (`provenance: "fixtured"`), so CI stays green without
  cloud credentials. The `@aws-sdk`/`google-auth-library` transitive types never
  leave the `vendors/` ACL.
- **Monitoring**: Dependabot / npm audit, tracked with the core SDK.
- **Exit strategy**: Each transport is a single adapter file plus a `Provider`
  union member, `CREDENTIAL_SPEC`/`CLIENT_FACTORY` entry, and model cards; the
  shared Messages client and the `CompletionClient` port are unchanged. Dropping a
  backend removes its SDK, adapter, and registry entries. Bedrock's `anthropic.`
  wire-id prefix is applied only at that adapter's boundary.

### OpenRouter aggregator backend (packages/tech) — no new dependency

- **Reason**: The IaaS-hosted-models mission's third backend category is aggregator
  gateways ("one key, one bill, failover"). A survey of the candidates
  (OpenRouter / Groq / Together / Fireworks / DeepInfra) found that **only
  OpenRouter serves the models this registry already tracks** — the others host
  open-weight models the registry does not track, which the mission puts out of
  scope. See `docs/adr/0007-aggregator-gateway-subset.md` for the survey and the
  decision. OpenRouter speaks the OpenAI Chat Completions protocol at
  `https://openrouter.ai/api/v1`, so it is reached through the existing
  `createOpenAiCompatibleCompletionClient(model, key, baseURL)` — the same pattern
  as the xAI and Perplexity backends. No new package is added; the base URL lives
  in `packages/tech/src/vendors/llm/openrouter.ts`.
- **Assessment**:
  - License: n/a (repository code, MIT). Uses the already-adopted `openai` SDK.
  - Reputation / Development status / Sustainability: n/a (in-repo wrapper).
- **Auth**: `OPENROUTER_API_KEY`, resolved through the generalized credential
  contract (`apiKey` spec). Absent key → the keyless fixture fallback
  (`provenance: "fixtured"`), so CI stays green without a key.
- **Monitoring**: n/a. The gateway's catalogue and pricing move — re-check its
  public `/api/v1/models` endpoint before relying on the curated cards.
- **Exit strategy**: Removing the backend is deleting `openrouter.ts`, its
  `CREDENTIAL_SPEC`/`CLIENT_FACTORY` entries, the `Provider` union member, and its
  model cards. Model ids are OpenRouter's own spelling, carried per card, so no
  translation layer exists to unwind; the `CompletionClient` port is unchanged.

### Agent VM / sandbox providers — `vendors/sandbox` port, no SDK yet

- **Reason**: The `agent-vm` topic compares sandbox / microVM platforms (E2B,
  Modal, Fly Machines, Daytona, Cloudflare, Vercel, Northflank, AWS Lambda
  microVMs). Their reference metrics (isolation, published price, capability)
  are curated catalog data in `packages/tech/src/agent-vm/models.ts` and need no
  SDK. The measured cold-start / cost probe reaches providers through the
  `packages/tech/src/vendors/sandbox/` anti-corruption port
  (`bootCold`/`reuseWarm`/`runTask`/`teardown`), which currently has only a
  keyless fixture implementation.
- **License**: No third-party sandbox SDK is added. The first real adapter
  (Fly.io Machines, `vendors/sandbox/fly.ts`) speaks the Machines REST API over
  plain `fetch` through an injectable transport — **zero new dependencies**.
  Future provider adapters that need an SDK add it here with its license at that
  time; prefer the same SDK-free HTTP approach where the provider offers a REST
  API.
- **Exit strategy**: The registry, port, and scorers are self-contained. Adding
  or replacing a provider is a `models.ts` row plus a `vendors/sandbox` adapter;
  the domain scoring (percentiles, cost) and report do not change. A real
  adapter MUST tear down every sandbox it boots (zero orphaned resources, like
  the RAG teardown guarantee).

### Perplexity Sonar — reuses the installed `openai` SDK, no new package

- **Reason**: The `trend-recency` topic compares web-grounded knowledge recency,
  and Perplexity Sonar is its one search-native subject with no ungrounded twin.
  Sonar's API speaks the OpenAI Chat Completions protocol at a different base URL
  (`https://api.perplexity.ai`) and returns the sources it grounded on, so the
  anti-corruption layer at `packages/tech/src/vendors/llm/perplexity.ts` wraps the
  already-installed `openai` SDK with the base URL swapped — the same pattern as
  the xAI adapter. **No new dependency is taken on.**
- **License**: no new package; `openai` is already a dependency. Sonar usage is a
  paid API keyed on `PERPLEXITY_API_KEY`; the keyless fixture path
  (`createFixtureGroundedAnswerClient`) renders the subject deterministically so
  CI needs no key or spend.
- **Exit strategy**: the Sonar-specific facts (base URL, the `citations` /
  `search_results` response extensions) are confined to `perplexity.ts` behind the
  provider-neutral `GroundedAnswerClient` port; dropping or swapping the provider
  is a registry + adapter change with no domain impact.

### @resvg/resvg-js (packages/tech)

- **Reason**: The `svg-generation` topic's prompt-fidelity metric rasterizes
  each generated SVG to a PNG the fixed vision judge reads. Writing an SVG
  renderer ourselves is out of scope, and nothing already present rasterizes
  SVG (the repo's Playwright harness is a computer-use test tool, not a build
  dependency, and a headless browser is a far heavier exit). resvg's N-API
  binding renders headless and hermetically — pure native code, no browser, no
  network — so it also runs keylessly in CI. Isolated behind the
  `SvgRasterizer` port at `packages/tech/src/vendors/raster/`; the keyless
  benchmark fixture path uses a pure stub (`fixture.ts`) and never loads the
  engine (the real engine is dynamically imported by real runs only).
- **Assessment**:
  - License: MPL-2.0 (binding and the underlying resvg crate) — file-level
    copyleft, compatible with this MIT repo as an unmodified npm dependency.
  - Reputation: The de-facto Node binding of resvg (the reference Rust SVG
    renderer used by many toolchains); broad adoption, prebuilt binaries per
    platform (including linux-arm64), no known security incidents.
  - Development status: Maintained; releases track the upstream resvg crate.
  - Sustainability: Single primary maintainer over a healthy upstream
    (linebender/resvg); the port keeps the exit cheap if either stalls.
- **Monitoring**: Dependabot (`.github/dependabot.yml`), `npm audit` in CI, and
  the hermetic `vendors/raster/resvg.test.ts` proving headless rasterization on
  every CI run.
- **Exit strategy**: Reached only through the `SvgRasterizer` port
  (`vendors/raster/types.ts`). The engine name is recorded in every run
  artifact as instrument provenance, so swapping to another renderer (or a
  headless-browser render) is a one-adapter change plus a manifest-version
  bump — never a silent re-scoring.

### Tokenizer libraries — evaluated and NOT adopted (token-metering topic)

- **Reason**: The `token-metering` topic (and the plgg library it feeds) needs
  input-token counts. Candidates evaluated: `tiktoken` (OpenAI encodings), the
  archived `@anthropic-ai/tokenizer` (legacy Claude 2 only — cannot count for
  current models), and Hugging Face `tokenizers`/transformers (OSS models).
  Per the vendor-neutrality policy's implement-by-default principle the
  self-implementation was chosen: the BPE inference loop is small
  (`packages/tech/src/token-metering/domain/bpe.ts`), runs against *published
  data* (see the next entry), and one implementation covers every provider
  that publishes its vocabulary, where each library covers one provider and
  none covers Anthropic's current models.
- **Assessment**: All candidates are reputable and permissively licensed
  (MIT/Apache-2.0); the deciding factors were coverage (none spans providers;
  none covers Anthropic) and the per-consumer dependency cost (native/WASM
  artifacts in every consumer).
- **Monitoring**: The topic's recurring trial re-validates the self-count
  against the live APIs each run (holdout error vs. `usage.prompt_tokens` /
  count endpoints), so a provider-side tokenizer change surfaces as an error
  regression — the same signal a library adopter waits for in a release note.
- **Exit strategy**: The counting sits behind the topic's domain interface;
  if a provider ships an encoding the self-count cannot reproduce within the
  stated band, the reference library can be adopted for that provider only,
  behind the same interface, recorded here.

### Published tokenizer vocabularies (data downloads, token-metering topic)

- **Reason**: The exact self-BPE counts replay each provider's *published*
  vocabulary: `o200k_base.tiktoken` (OpenAI's public encodings bucket) and
  `tokenizer.json` of `Qwen/Qwen2.5-Coder-32B-Instruct` (Hugging Face). These
  are data files, not libraries: fetched by real runs into
  `packages/tech/.cache/token-metering/` (gitignored), never committed, never
  a runtime dependency of consumers.
- **Assessment**:
  - License: o200k_base is published under OpenAI's tiktoken (MIT); the Qwen2.5
    tokenizer ships under Apache-2.0. Both permit this use.
  - Reputation / status: both are the authoritative artifacts their model
    families load; URLs are recorded per family in
    `packages/tech/src/token-metering/models.ts` with last-verified dates.
- **Monitoring**: The recurring trial fails loudly if a fetch breaks or a
  vocabulary drifts from the API-reported counts (0.00% holdout error is the
  trial's baseline for the exact families).
- **Exit strategy**: The files are addressed through
  `packages/tech/src/vendors/token-count/vocabularies.ts`; a moved or
  re-licensed source is a one-file URL change, and a withdrawn vocabulary
  degrades that family to the calibrated-estimator method with a stated band.

> Per-research dependencies (LLM provider SDKs, database drivers, datasets) are
> added here by the ticket that introduces them, behind a `src/vendors/`
> anti-corruption layer.
