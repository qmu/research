---
title: Agent SDKの比較
description: LLMs Research (Japanese) におけるAgent SDKの比較。OpenAI Agents SDK、Claude Agent SDK、Cloudflare Agents SDK、LangGraphを、公開ドキュメントに基づく設計比較として整理する。
---

# Agent SDKの比較

Agent SDKの比較は、LLMアプリケーションを実装するエンジニアが、agent framework / agent runtime を選ぶための検証区分である。初回版は公開ドキュメントに基づく **設計比較** であり、実測ベンチマークではない。

このページでは、性能、費用、信頼性、開発速度を測った数値は公開しない。測っていない項目は **未測定** と書き、公開情報だけでは断定しにくい項目は **要確認** と書く。

## 1. 検証の目的

Agent SDKは、単なるモデル呼び出しラッパーではなく、状態、ツール実行、承認、長時間実行、観測、デプロイ先を含むアプリケーション基盤になりやすい。この検証は、SDKを採用する前に次を分けて判断できる資料を作ることを目的とする。

- SDKが提供する抽象と、ホスティング基盤が提供する実行保証を分ける。
- 公開ドキュメントで確認できる設計上の機能と、未測定の運用品質を分ける。
- 用途別に候補を絞るための比較軸をそろえる。

## 2. 比較しているもの

このページでは、Agent SDKを「agent loop、tool calling、state、control、observability をアプリケーションから扱うための開発単位」として比較する。ベンダーのモデル品質や個別モデルの推論性能は比較しない。

| 区分 | 内容 | Provenance |
| --- | --- | --- |
| SDK単体 | agent loop、tool定義、状態インターフェース、structured output、承認フローなど、アプリケーションコードから直接使う設計 | 設計比較 |
| whole-stack | SDKに加えて、ホスティング、永続化、実行再開、観測基盤、ベンダー提供ツールまで含めた採用時の姿 | 設計比較 |
| 運用品質 | レイテンシ、失敗率、リトライ成功率、費用、開発時間、保守負荷 | 未測定 |
| 公開情報だけで断定できない詳細 | バージョン別API差分、制限値、特定クラウド構成での保証、実運用での障害耐性 | 要確認 |

## 3. 比較対象

初回版では、公開ドキュメントで主要な設計要素を確認できる次の4件を対象にする。

| 対象 | SDK単体として読む範囲 | whole-stackとして読む範囲 | Provenance |
| --- | --- | --- | --- |
| OpenAI Agents SDK | Agents、tools、handoffs、guardrails、sessions、tracing などのPython SDK設計 | OpenAI API、Responses API、sandbox / realtime 関連機能と組み合わせた構成。ホスティング自体はアプリ側で設計する前提 | 設計比較 |
| Claude Agent SDK | Claude Codeのagent loop、組み込みファイル/コマンド系tools、sessions、hooks、structured output、OpenTelemetry観測をPython / TypeScriptから使う範囲 | Claude Codeの実行モデル、Claude API認証、コードベース作業向けの組み込みtoolsを含む構成 | 設計比較 |
| Cloudflare Agents SDK | Agent class、state、sessions、routing、WebSocket、scheduling、durable execution、tools連携をWorkersアプリから使う範囲 | Cloudflare Workers、durable runtime、local SQL storage、Workflows、Browser、Sandbox、AI Search、MCP等を含む構成 | 設計比較 |
| LangGraph | StateGraph、persistence、interrupts、streaming、subgraphsなどの低レベルorchestration設計 | LangChain / LangSmith / LangGraph Platformと組み合わせた構成。単体利用とプラットフォーム利用を分けて読む | 設計比較 |

参照した公開ドキュメント:

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [Cloudflare Agents](https://developers.cloudflare.com/agents/)
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)

## 4. 範囲と制約

- このページは `2026-07-09` 時点で確認した公開ドキュメントに基づく設計比較である。
- live API、paid API、vendor-hosted agent実行は行っていない。
- SDKの機能名、提供範囲、推奨APIは短期間で変わるため、導入前には採用予定バージョンの一次情報を再確認する。
- 「長時間実行」や「リトライ」は、SDK内の再試行制御と、ホスティング基盤の復旧保証を分けて読む。
- 「observability」は、SDKがtrace / metrics / logsを出す設計と、運用画面や保持期間を分けて読む。
- 「vendor lock-in」は低いほどよいという単純評価ではなく、どの制約を受け入れるかを明確にするための軸である。

## 5. Provenanceの読み方

各表のセルには、次のいずれかを明記する。

| ラベル | 意味 |
| --- | --- |
| 設計比較 | 公開ドキュメントまたは公開されたアーキテクチャから確認できる設計上の比較 |
| 未測定 | この検証では実測していない。数値、順位、運用品質として読んではならない |
| 要確認 | 公開情報だけでは自信を持って比較できない、または採用時のバージョン・構成で確認が必要 |

## 6. SDK単体とwhole-stackの分離

| 対象 | SDK単体の見方 | whole-stackの見方 |
| --- | --- | --- |
| OpenAI Agents SDK | 設計比較: Pythonアプリ内でagent loop、tools、handoffs、guardrails、sessions、tracingを扱うSDKとして読む | 設計比較: OpenAI API群との結合は強いが、アプリのホスティング、ジョブ管理、外部DBは別途設計する |
| Claude Agent SDK | 設計比較: Claude Codeのagent loopと組み込みtoolsをライブラリ化した実行系として読む | 設計比較: コードベース編集、shell実行、権限、hooksまで含む開発作業向けスタックとして読む |
| Cloudflare Agents SDK | 設計比較: Workers上のAgent classとstateful runtime APIとして読む | 設計比較: durable identity、storage、real-time connection、scheduled work、recoverable executionまで含むCloudflareスタックとして読む |
| LangGraph | 設計比較: state graphとcheckpointを中心にした低レベルorchestrationとして読む | 設計比較: LangSmithやLangGraph Platformを使う場合は観測・デプロイ込みのスタックとして読む。単体利用では自前運用も残る |

## 7. 指標別の比較

| 軸 | OpenAI Agents SDK | Claude Agent SDK | Cloudflare Agents SDK | LangGraph |
| --- | --- | --- | --- | --- |
| 状態管理 | 設計比較: sessionsで会話履歴を扱い、複数のbackend実装を選べる。未測定: 長期保持・大規模運用の負荷 | 設計比較: sessionsと外部保存の導線がある。未測定: セッション保存の運用品質 | 設計比較: Agentごとのstate、sessions、local SQL storageをruntimeの中核として扱う。未測定: データ量別の性能 | 設計比較: persistence / checkpointer / memoryをgraph実行に組み込む。未測定: backend別の性能 |
| tool calling | 設計比較: function tools、MCP、handoffsをSDK抽象として扱う。未測定: tool数増加時の遅延 | 設計比較: Read、Write、Edit、Bash等の組み込みtoolsとMCPを使える。要確認: 本番アプリで許可すべきtool境界 | 設計比較: MCP、Browser、Sandbox、AI Search等のCloudflare toolsと接続しやすい。未測定: toolごとの費用と遅延 | 設計比較: tool実行はgraph nodeやLangChain連携で構成する。要確認: 採用するtool frameworkごとの差 |
| 長時間実行 | 設計比較: agent loopとsessionsで複数stepを扱う。要確認: hosting側の復旧保証は構成依存 | 設計比較: Claude Code由来の作業loopをSDKから扱う。要確認: 長時間ジョブのhosting設計 | 設計比較: scheduling、durable execution、recoverable executionをruntime機能として扱う。未測定: 実復旧時間 | 設計比較: durable execution、persistence、resumeを中心軸にする。未測定: 実復旧時間 |
| リトライ | 要確認: SDK内のerror handlingとアプリ側retry policyの境界を採用時に確認する | 要確認: SDK、tool実行、hosting側retryの責務境界を採用時に確認する | 設計比較: retriesやqueue / workflow連携の導線がある。未測定: retry成功率 | 設計比較: fault toleranceを設計軸に持つ。未測定: retry成功率 |
| human-in-the-loop | 設計比較: human-in-the-loopとrun interruption / resumeの導線がある。未測定: 承認UI実装工数 | 設計比較: approvals / user input / permissions / hooksで制御点を置ける。未測定: 承認UI実装工数 | 設計比較: starterやpatternsでhuman-in-the-loop approvalを扱う。未測定: 承認UI実装工数 | 設計比較: interruptsで人間がstateを点検・変更する設計を持つ。未測定: 承認UI実装工数 |
| structured output | 設計比較: output schema / Pydantic系の型付け導線がある。未測定: スキーマ遵守率 | 設計比較: structured outputの公式導線がある。未測定: スキーマ遵守率 | 要確認: SDK runtime単体と選択するmodel / harness側のstructured output責務を分けて確認する。未測定: スキーマ遵守率 | 設計比較: state schemaでgraph内部状態を型付けできる。要確認: model出力のschema保証は接続するmodel/tool層に依存 |
| observability | 設計比較: built-in tracingを持つ。未測定: trace保持・運用画面の適合性 | 設計比較: OpenTelemetry observabilityとcost / usage trackingの導線がある。未測定: trace保持・運用画面の適合性 | 設計比較: logs、metrics、tracesをCloudflare運用面に接続する設計。未測定: 保持期間・費用 | 設計比較: LangSmith連携でtrace / debug / evaluationを扱う。未測定: LangSmith非採用時の運用負荷 |
| deployment / runtime | 設計比較: SDKはアプリ内runtimeで、deploy先は利用者が選ぶ。未測定: deploy別の差 | 設計比較: Python / TypeScript SDKからClaude Code runtimeを使う。要確認: hosting制約とbinary配布条件 | 設計比較: Cloudflare Workers上にhostする前提が強い。未測定: cold startやリージョン差 | 設計比較: standalone実行とLangGraph Platform利用を分けられる。未測定: deploy先別の差 |
| vendor lock-in | 設計比較: OpenAI APIとの結合が強いが、モデルprovider差し替え導線もある。要確認: provider別の同等性 | 設計比較: Claude Code機能とAnthropic認証への結合が強い。要確認: 他provider利用時の同等性 | 設計比較: Cloudflare runtime採用で基盤結合は強い。要確認: 他基盤への移植費 | 設計比較: framework単体はprovider中立に寄せやすい。要確認: LangSmith / Platform採用時の結合度 |
| local-dev ergonomics | 設計比較: Python SDKとして始めやすい。未測定: 初回実装時間 | 設計比較: Python / TypeScript SDKと組み込みtoolsでコードベース作業を始めやすい。未測定: 初回実装時間 | 設計比較: starterとlocal dev導線がある。未測定: 初回実装時間 | 設計比較: graph設計の自由度が高い一方、抽象理解が必要。未測定: 初回実装時間 |

## 8. 総合比較

| 用途 | 候補 | 読み方 |
| --- | --- | --- |
| OpenAI APIを中心に、軽量なagent loop、tools、handoffs、tracingを早く組みたい | OpenAI Agents SDK | 設計比較: SDKがagent loopを持つため、アプリ側はworkflowと永続化境界を設計する。未測定: 実装時間、費用、安定性 |
| コードベースを読み、編集し、コマンドを実行する開発作業agentを作りたい | Claude Agent SDK | 設計比較: Claude Code由来の組み込みtoolsと権限制御が中核。要確認: 本番アプリで許すtool権限と監査要件 |
| Workers上で、状態、接続、scheduled work、復旧をhosted runtimeに寄せたい | Cloudflare Agents SDK | 設計比較: SDK単体というよりCloudflare実行基盤込みで評価する。未測定: 実運用コストと遅延 |
| provider中立寄りに、複雑なstateful workflowを明示的なgraphとして管理したい | LangGraph | 設計比較: 低レベルorchestrationを自分で設計できる。未測定: 学習コスト、運用コスト |

この初回版では、汎用的な勝者を決めない。採用判断では、まず「どこまでをSDKに任せ、どこからを自社のアプリケーション基盤で持つか」を決める。特にCloudflare Agents SDKのようにruntimeとhostingが密結合した候補と、LangGraphのように低レベルorchestrationを提供する候補は、同じ列で単純順位にしない。

## 9. 再現方法

このページは、公開ドキュメントを読み、各セルにprovenanceを付けることで再現する。live APIやpaid APIは使わない。

```sh
# 公開ページを確認する。APIキーは不要。
open https://openai.github.io/openai-agents-python/
open https://code.claude.com/docs/en/agent-sdk/overview
open https://developers.cloudflare.com/agents/
open https://docs.langchain.com/oss/python/langgraph/overview
```

更新時の手順:

1. 各候補の公式ドキュメントで、state、tools、long-running execution、retries、human-in-the-loop、structured output、observability、deployment/runtime、vendor lock-in、local-dev ergonomicsに関するページを確認する。
2. SDK単体の機能と、hosting / runtime / providerまで含むwhole-stack機能を分ける。
3. 実測していない性能・費用・信頼性・開発時間は **未測定** とする。
4. 公開情報だけで比較できない詳細は **要確認** とする。
5. live APIを実行した場合だけ、実行日時、バージョン、入力、出力、費用見積もり、artifactを残して、別の実測記事として扱う。
