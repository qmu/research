---
title: トークン計測
source_artifact: docs/research-reports/token-metering-comparison.data.json
source_commit: ec158df
insights_model: source-report
translated_from: token-metering-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-17T03:02:34.699Z
trials: 0
provenance: llm-translation
---
# トークン計測

このレポートは、LLM APIが課金対象とする入力トークンを**プロバイダのトークナイザーライブラリなしで**数えられるかどうかを測定する。プロバイダがトークナイザーの語彙とマージルールを公開している場合（OpenAIのencodings、オープンウェイトモデルの`tokenizer.json`）、自前実装のbyte-pair-encodingカウンターの厳密性を検証する。トークナイザーが非公開の場合（Anthropic Claude、Google Gemini）は、プロバイダの非課金カウントエンドポイントに対してキャリブレーション済みの推定器を適合させ、その誤差幅を報告する——あくまで幅を明示した推定であり、偽りの精度は主張しない。この2つのカウント方式の違いと、それに付随する課金上のエッジケース（日本語テキスト、出力トークンの事前推定、キャッシュ/ツール課金、画像の変換）が、プリンシパルごとの使用量メータリングをプロバイダ非依存で構築できるかどうかを左右する。

## 1. 調査の目的

本調査の目的は、4つのプロバイダーファミリーについて、入力トークンがどのように数えられるか、どのような条件下でライブラリに依存しないセルフカウントが可能か、固定されたサンプルセットに対してAPIが報告するカウントと比較した際にどの程度の精度に達するか、そしてその数え方がどのような価格構造に適用されるか——使用量計測とコスト帰属レイヤーが構築される土台となる性質——を記録することにある。

## 2. 測定対象

### 対象モデル

対象は、キュレーションされたレジストリ（`packages/tech/src/token-metering/models.ts`）に含まれる4つのプロバイダファミリーそれぞれの代表モデル1つずつであり、カウント方式はプロバイダが公開している内容によって決まる。

- **Anthropic Claude**（`anthropic-claude`、`claude-sonnet-5`で測定）: 現行モデル向けのトークナイザーは公開されていない（アーカイブされた @anthropic-ai/tokenizer はレガシーな Claude 2 のみ対応）ため、正確な自己カウントは存在しない。自己カウントは、課金対象外の count_tokens エンドポイントに対してキャリブレーションされた推定器である。出典: https://platform.claude.com/docs/en/build-with-claude/token-counting （2026-07-17 検証）。
- **OpenAI GPT**（`openai-gpt`、`gpt-5.5`で測定）: OpenAI は自社エンコーディングの語彙をランク付けされたバイト列（o200k_base、約200k エントリ）として公開しており、これに事前トークン化パターンを加えている。count-tokens エンドポイントは存在しないため、正解データは最小構成の課金対象コンプリーションから得られる usage.prompt_tokens である。出典: https://developers.openai.com/api/docs/pricing （2026-07-17 検証）。
- **Google Gemini**（`google-gemini`、`gemini-3.1-pro-preview`で測定）: SentencePiece 系統。Google は Gemma のトークナイザーモデルは公開しているが、現行の Gemini API のトークナイザーは公開していないため、自己カウントは課金対象外の countTokens エンドポイントに対してキャリブレーションされた推定器である。出典: https://ai.google.dev/gemini-api/docs/tokens （2026-07-17 検証）。
- **OSS / ローカル（Qwen2.5）**（`oss-qwen`、`@cf/qwen/qwen2.5-coder-32b-instruct`で測定）: オープンウェイトモデルは tokenizer.json（語彙 + 順序付きマージリスト + 事前トークン化パターン、Qwen2.5 は Apache-2.0）を同梱しているため、正確な自己カウントが存在する。正解データは、ホスティングされたサービングスタック（Cloudflare Workers AI）が報告する usage.prompt_tokens である。出典: https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct （2026-07-17 検証）。

### 対象メトリクス

主要メトリクスは、自己カウントによる予測値とAPIが報告するトークン数とのホールドアウト平均絶対誤差（%）および最大絶対誤差（%）であり、値が低いほど良く、クラスごとの合意された目標は |誤差| ≤ 5% である。これに加え、クラスごとの符号付き誤差幅 [min, max] を測定する。記述的なメトリクスとしては、フィットされたラッパーのオーバーヘッド（リクエストあたりのトークン数）、クラスごとの文字あたりトークン発生率、およびプローブ支出（USD、参考値）がある。コスト算出に用いる価格は、基盤モデルカタログに掲載されている MTok あたりの公開レートである。

## 3. 範囲と制約

- **入力トークンのみを対象とする。** 出力トークンは実行前にカウントできない（モデルがいつ停止するかを決定するため）。その事前推定に関するセマンティクスはエッジケースとしてセクション5で分析し、実行後の計上はレスポンスのusageフィールドを参照する。
- **課金の突き合わせではなく、カウントの検証である。** このチェックはトークン数を比較するものであり、請求書レベルの突き合わせ（端数処理、最低料金、段階割引）は範囲外とする。
- **各ファミリーにつき代表モデル1つを使用する。** カウントは `claude-sonnet-5`、`gpt-5.5`、`gemini-3.1-pro-preview`、`@cf/qwen/qwen2.5-coder-32b-instruct` に対して検証されている。同一ファミリー内の他のモデルは異なるトークナイザーを使用している可能性があり、キャリブレーションを再利用する前に再検証しなければならない（MUST）。
- **サンプルマニフェストは固定されている**（tm-v1：サンプル数30、クラスごとに10、キャリブレーション用とホールドアウト用が半々）。精度に関する主張はこれらのクラスと長さについてのみ成立し、それ以外のコンテンツクラス（例：base64のブロブ、密なUnicodeアート）は未検証である。
- **ラッパーのオーバーヘッドはフィッティングによるものであり、公式に文書化されたものではない。** プロバイダーはチャットテンプレートのトークンコストを公開していないため、アフィンモデルはこれをフィッティングされた定数として吸収している。これは、ここで使用されている単一ユーザーメッセージ形式のリクエストを前提としている。
- キーなしのフィクスチャ経路は決定論的であり、明らかに合成的なものである（バイト数ベースの語彙、固定レート）。実際のエラー値は、承認されたコスト上限内でオーナーが起動する実実行からのみ得られる（まず `--estimate` を実行すること）。
- **時点情報：** 測定された挙動は、`2026-01-01T00:00:00.000Z` 時点における各プロバイダーのトークナイザーおよびカウントエンドポイントを反映したものである。語彙や価格は各行の出典および検証日時点のものである。

## 4. 検証結果

今回の実行では、4ファミリー行のうち **4件が fixtured** となっている（残りは、認証情報や語彙が欠落している `unreachable`、または `error` であり、カウントを偽って埋めることはない）。精度は、tm-v1 ホールドアウトの半分（15サンプル：英語5、日本語5、コード5）を対象に、各プロバイダのAPI報告カウントと照合して判定している。

| ファミリー | 自己カウント方式 | ホールドアウト平均絶対誤差 | ホールドアウト最大絶対誤差 | ±5%目標 |
| ------ | ----------------- | ---------------------- | --------------------- | ------- |
| Anthropic Claude | 校正済み推定器 | 1.30% | 2.50% | ±5%以内 |
| OpenAI GPT | 厳密な自己BPE | 0.00% | 0.00% | ±5%以内 |
| Google Gemini | 校正済み推定器 | 1.30% | 2.50% | ±5%以内 |
| OSS / ローカル（Qwen2.5） | 厳密な自己BPE | 0.00% | 0.00% | ±5%以内 |

誤差は、自己カウントによるプロバイダ報告合計（コンテンツトークン＋フィッティングされたラッパーオーバーヘッド）の予測値を、実際の報告合計と比較したものである。クラスごとの誤差幅、校正パラメータ、サンプルごとの行は、セクション7「検証データ」に記載している。

**推移 / Trend across surveys**

これはこのシリーズにおける最初の比較可能な調査であるため、まだ図示できる複数回にわたる調査の推移は存在しない。同一手法による2回目の調査がアーカイブされた時点で、ここに推移グラフが表示される。これまでの調査は「検証データ」の下にリンクされている。

## 5. 考察

今回の実行はキーレス（keyless）のフィクスチャである。カウントはハーネス（合成語彙、固定レート）を実証するものであり、ここではファミリー間の精度に関する主張は行わない。日付入りのサーベイが測定済みの比較を担う。

#### エッジケース1 — 日本語テキスト

日本語は英語の文字あたりトークンレートの数倍でトークン化される（セクション7のクラス別・文字あたりトークンレートを参照）：語彙はラテン文字が支配的であるため、多くの漢字はバイト単位のピースにフォールバックする。英語のレートを前提とするコスト予測は日本語の入力を過小評価する。キャリブレーションにおけるクラス別レートがその補正であり、日本語のホールドアウト帯がどこまで信頼できるかを示している。

#### エッジケース2 — 出力トークンは事前にカウントできない

異なる2つの量を混同してはならない：**実行前の見積もり**（モデルがいつ停止するかを決めるため、境界値しか存在しない — リクエストのmax-tokens上限が絶対的な上限であり、ワークロードごとの過去の出力/入力比率から期待値が得られる）と、**実行後の実績**（レスポンスのusageフィールドから得られる正確な値：出力トークン、およびプロバイダが出力として課金する場合の推論トークン）。メータリング層は実行後の実績を保存し、実行前の境界値はクォータ承認のみに使用し、課金には決して使わない。

#### エッジケース3 — キャッシュとツール利用の課金

キャッシュを使うリクエストやツールを伴うリクエストは、同じトークン数でも異なるレートで課金されるため、メーターは1つの数値ではなく使用内訳を保持しなければならない。プロンプトキャッシュの書き込みは基本入力レートより高く課金され、キャッシュ読み取りはその一部の割合で課金される（各プロバイダは独自の倍率とキャッシュ可能な最小長を公開している）。レスポンスのusageフィールドはキャッシュ書き込みトークンとキャッシュ読み取りトークンを別々に報告し、メーターは各バケットをそれぞれのレートで価格付けしなければならない。ツール定義はプロンプトにシリアライズされ、通常の入力トークンとして課金される — Anthropicのcountエンドポイントにおける1つのツール定義の実測オーバーヘッドはセクション7にある — また、プロバイダ側のツール結果（例：ウェブ検索）はコンテキストに戻り、次のターンで入力として課金される。

#### エッジケース4 — 画像とマルチモーダル入力

画像トークンの変換はBPEではなく数式ベースである：Anthropicはwidth×height/750（自動ダウンスケーリングによって上限あり）を文書化しており、Googleは384px以下では画像あたり固定258トークン、それを超えると768×768タイルあたり258を文書化しており、OpenAIはモデルファミリーごとにベース＋タイル方式のスケジュールを文書化している。1枚の固定されたPNGに対するプローブ結果はセクション7にある。メーターはこれらの変換をプロバイダごとに、テキストカウントと同じインターフェースの裏側で実装すべきであり、数式のバージョンを記録すべきである — プロバイダはモデル世代間で変換スケジュールを変更することがある。

#### 実装方針 — プリンシパル単位の使用量メータリング（設計章）

この調査が支えている利用側の設計（plggトークンメータリングライブラリおよびその利用者、例：qmu-co-jp sync-controller）は、呼び出し側が保持する使用量レコードを通じて、使用量を**プリンシパル**（qmu.appプランのRBAC/PBACサブジェクト）に帰属させる：

- **レコード形式**：`{ recordedAt, principalId, model, inputTokens, cachedInputTokens, outputTokens, costUsd, countingMethod, calibrationVersion }` — 使用量の内訳はプロバイダのusageフィールドを反映しており、コストはその入力/キャッシュ/出力の分解を保持し、カウント方式とキャリブレーションバージョンによって、保存されたすべての数値が再導出可能になる。
- **データ最小化／主権**：レコードはカウントと金額のみを保存し、プロンプトや補完のテキストは決して保存しない。`principalId`は不透明な内部識別子である（可観測性ポリシーの構造化ログ制約に従い、非PII）。削除のセマンティクスはスキーマ設計時に決定される — 使用量レコードは課金の証跡であるため、アカウント削除は`principalId`を匿名化する（人物との紐付けを不可逆的に切り離す）のであって、財務上の合計を破棄するわけではない。この保持方針は開示される。
- **メトリクス出力**：可観測性ポリシーに従い、集計はプロバイダ固有のダッシュボードではなく、ベンダー非依存の形式（プリンシパル／モデル／トークンバケットごとのOpenMetricsカウンター）でエクスポートされる。
- **ブランド型**：トークン数とUSD金額は別々のブランド付き数値型であり、価格を介した明示的な変換なしには、カウントが金額に加算されることはない — これは本調査自身のハーネス型が強制しているコンパイル時の誤用防止と同じものである。
- **ACL境界**：トークナイザーの語彙、countエンドポイント、usageフィールドは腐敗防止層（anti-corruption layer）の裏側にあるプロバイダの詳細であり、ドメイン側からは`countTokens(model, text)`と`estimateCost(model, usage)`のみが見える。

#### 依存関係の意思決定 — トークナイザーライブラリ（4点ログ）

1. **理由**：カウントにはトークナイザーが必要である。候補は`tiktoken`（OpenAIエンコーディング）、アーカイブ済みの`@anthropic-ai/tokenizer`（レガシーなClaude 2専用 — 現行モデルには使用不可）、Hugging Faceの`tokenizers`／transformers（OSSモデル向け）。
2. **評価**：いずれも信頼できるパーミッシブライセンス（MIT/Apache-2.0）であるが、それぞれ1つのプロバイダのみをカバーしており、Anthropicの現行モデルをカバーするものはなく、これらを採用すると各消費者にプロバイダごとのネイティブ／WASM依存が持ち込まれることになる。
3. **決定とモニタリング**：ベンダー非依存ポリシーのデフォルト実装原則に従い、自前実装を採用する：BPE推論ループは*公開データ*（語彙）に対して約150行であり、本トピックの繰り返し試行そのものがモニタリング計画である — 実行のたびにライブAPIに対してカウントを再検証するため、トークナイザーの変更はホールドアウト誤差の回帰として表面化する。これはライブラリ採用者がリリースノートで待つのと同じシグナルである。
4. **撤退戦略**：カウントインターフェース（`countTokens`）は実装を隠蔽している。もしあるプロバイダが、自前カウントでは帯域内に再現できない公開ルールを持つエンコーディングを提供するようになった場合、そのプロバイダについてのみ、同じインターフェースの裏側でリファレンスライブラリを採用でき、これは`docs/dependency-decisions.md`に記録される。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的な固定語彙・件数によるフィクスチャ）:
npm run research -- token-metering --fixture

# コストのプレビュー、その後オーナー限定の実実行（プロバイダーのキーが必要）:
npm run research -- token-metering --estimate
npm run research -- token-metering --real
```

実実行では、公開されている語彙（o200k_base.tiktoken; Qwen2.5 の tokenizer.json）を `packages/tech/.cache/token-metering/` に取得する — これらは `docs/dependency-decisions.md` に記録されたデータダウンロードであり、コミットされることはない。

### 再現コスト（目安）

フィクスチャ経由はキー不要かつコストゼロである。実トライアルでは課金対象外の2つのカウントエンドポイント（Anthropic の count_tokens、Gemini の countTokens — $0）を読み取り、2つの使用量計測系（`gpt-5.5` と Workers AI の Qwen モデルに対してそれぞれ30件の短いプロンプト）に対してサンプルごとに最小限の課金対象コンプリーションを1回実行する: --estimate の見積もりでは、これがトライアルあたりセント単位の範囲であることが示される。ミッション全体の測定における合意された上限は$5であり、`--estimate` を先に実行しなければならない。

### クリーンアップ

実実行では何もプロビジョニングされない（ステートレスなAPI読み取りと最小限のコンプリーションのみ）ため、後片付けするものは何もない。ローカルのMarkdown/JSON成果物と語彙キャッシュを `packages/tech/.cache/` 配下に書き込む — コミット前に成果物をレビューすること。なお、このキャッシュは gitignore 対象である。

## 7. 検証データ

**ファミリーごとのキャリブレーション、クラスごとの誤差、サンプル数**

**Anthropic Claude**（`claude-sonnet-5`、キャリブレーション済み推定器、正解データ: count-tokens-endpoint、プローブ費用 $0.0000）

キャリブレーション: ラッパーオーバーヘッド 3 トークン; 文字あたりトークン数 english 0.2646、japanese 1.0393、code 0.3379（推定器ファミリーはこれらの値を用いて予測し、厳密ファミリーはこれらを記述統計として報告する）。

| クラス | ホールドアウト n | 平均絶対誤差 | 最大絶対誤差 | 符号付き帯域 | 目標内 |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 1.28% | 1.52% | [-1.52%, 1.19%] | yes |
| japanese | 5 | 0.84% | 1.29% | [-1.11%, 1.29%] | yes |
| code | 5 | 1.79% | 2.50% | [0.98%, 2.50%] | yes |

| サンプル | クラス | 役割 | 文字数 | UTF-8バイト数 | 自己コンテンツ | API合計 | 予測値 | 誤差 | 出所 |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 49 | 47 | -4.08% | fixtured |
| en-02 | english | holdout | 236 | 236 | — | 66 | 65 | -1.52% | fixtured |
| en-03 | english | calibration | 271 | 271 | — | 75 | 75 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | — | 98 | 99 | 1.02% | fixtured |
| en-05 | english | calibration | 259 | 259 | — | 72 | 72 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-07 | english | calibration | 300 | 302 | — | 82 | 82 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | — | 66 | 65 | -1.52% | fixtured |
| en-09 | english | calibration | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-10 | english | holdout | 320 | 320 | — | 87 | 88 | 1.15% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | — | 85 | 84 | -1.18% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | — | 90 | 89 | -1.11% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | — | 92 | 91 | -1.09% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | — | 155 | 157 | 1.29% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | — | 115 | 115 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | — | 93 | 92 | -1.08% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | — | 127 | 128 | 0.79% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | — | 101 | 101 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | — | 97 | 97 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | — | 143 | 144 | 0.70% | fixtured |
| code-01 | code | calibration | 204 | 204 | — | 72 | 72 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | — | 160 | 164 | 2.50% | fixtured |
| code-03 | code | calibration | 151 | 151 | — | 55 | 54 | -1.82% | fixtured |
| code-04 | code | holdout | 268 | 268 | — | 93 | 94 | 1.08% | fixtured |
| code-05 | code | calibration | 182 | 182 | — | 65 | 64 | -1.54% | fixtured |
| code-06 | code | holdout | 310 | 310 | — | 106 | 108 | 1.89% | fixtured |
| code-07 | code | calibration | 251 | 251 | — | 87 | 88 | 1.15% | fixtured |
| code-08 | code | holdout | 297 | 297 | — | 102 | 103 | 0.98% | fixtured |
| code-09 | code | calibration | 227 | 227 | — | 80 | 80 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | — | 120 | 123 | 2.50% | fixtured |

**OpenAI GPT**（`gpt-5.5`、厳密self-BPE、正解データ: usage-field-probe、プローブ費用 $0.0000）

キャリブレーション: ラッパーオーバーヘッド 7 トークン; 文字あたりトークン数 english 1.0000、japanese 3.0000、code 1.0000（推定器ファミリーはこれらの値を用いて予測し、厳密ファミリーはこれらを記述統計として報告する）。

| クラス | ホールドアウト n | 平均絶対誤差 | 最大絶対誤差 | 符号付き帯域 | 目標内 |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| サンプル | クラス | 役割 | 文字数 | UTF-8バイト数 | 自己コンテンツ | API合計 | 予測値 | 誤差 | 出所 |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 167 | 174 | 174 | 0.00% | fixtured |
| en-02 | english | holdout | 236 | 236 | 236 | 243 | 243 | 0.00% | fixtured |
| en-03 | english | calibration | 271 | 271 | 271 | 278 | 278 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | 365 | 372 | 372 | 0.00% | fixtured |
| en-05 | english | calibration | 259 | 259 | 259 | 266 | 266 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-07 | english | calibration | 300 | 302 | 302 | 309 | 309 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | 237 | 244 | 244 | 0.00% | fixtured |
| en-09 | english | calibration | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-10 | english | holdout | 320 | 320 | 320 | 327 | 327 | 0.00% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | 228 | 235 | 235 | 0.00% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | 249 | 256 | 256 | 0.00% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | 255 | 262 | 262 | 0.00% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | 440 | 447 | 447 | 0.00% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | 324 | 331 | 331 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | 254 | 261 | 261 | 0.00% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | 358 | 365 | 365 | 0.00% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | 282 | 289 | 289 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | 270 | 277 | 277 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | 384 | 391 | 391 | 0.00% | fixtured |
| code-01 | code | calibration | 204 | 204 | 204 | 211 | 211 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | 477 | 484 | 484 | 0.00% | fixtured |
| code-03 | code | calibration | 151 | 151 | 151 | 158 | 158 | 0.00% | fixtured |
| code-04 | code | holdout | 268 | 268 | 268 | 275 | 275 | 0.00% | fixtured |
| code-05 | code | calibration | 182 | 182 | 182 | 189 | 189 | 0.00% | fixtured |
| code-06 | code | holdout | 310 | 310 | 310 | 317 | 317 | 0.00% | fixtured |
| code-07 | code | calibration | 251 | 251 | 251 | 258 | 258 | 0.00% | fixtured |
| code-08 | code | holdout | 297 | 297 | 297 | 304 | 304 | 0.00% | fixtured |
| code-09 | code | calibration | 227 | 227 | 227 | 234 | 234 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | 354 | 361 | 361 | 0.00% | fixtured |

**Google Gemini**（`gemini-3.1-pro-preview`、キャリブレーション済み推定器、正解データ: count-tokens-endpoint、プローブ費用 $0.0000）

キャリブレーション: ラッパーオーバーヘッド 3 トークン; 文字あたりトークン数 english 0.2646、japanese 1.0393、code 0.3379（推定器ファミリーはこれらの値を用いて予測し、厳密ファミリーはこれらを記述統計として報告する）。

| クラス | ホールドアウト n | 平均絶対誤差 | 最大絶対誤差 | 符号付き帯域 | 目標内 |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 1.28% | 1.52% | [-1.52%, 1.19%] | yes |
| japanese | 5 | 0.84% | 1.29% | [-1.11%, 1.29%] | yes |
| code | 5 | 1.79% | 2.50% | [0.98%, 2.50%] | yes |

| サンプル | クラス | 役割 | 文字数 | UTF-8バイト数 | 自己コンテンツ | APIトータル | 予測値 | 誤差 | 出所 |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 49 | 47 | -4.08% | fixtured |
| en-02 | english | holdout | 236 | 236 | — | 66 | 65 | -1.52% | fixtured |
| en-03 | english | calibration | 271 | 271 | — | 75 | 75 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | — | 98 | 99 | 1.02% | fixtured |
| en-05 | english | calibration | 259 | 259 | — | 72 | 72 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-07 | english | calibration | 300 | 302 | — | 82 | 82 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | — | 66 | 65 | -1.52% | fixtured |
| en-09 | english | calibration | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-10 | english | holdout | 320 | 320 | — | 87 | 88 | 1.15% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | — | 85 | 84 | -1.18% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | — | 90 | 89 | -1.11% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | — | 92 | 91 | -1.09% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | — | 155 | 157 | 1.29% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | — | 115 | 115 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | — | 93 | 92 | -1.08% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | — | 127 | 128 | 0.79% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | — | 101 | 101 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | — | 97 | 97 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | — | 143 | 144 | 0.70% | fixtured |
| code-01 | code | calibration | 204 | 204 | — | 72 | 72 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | — | 160 | 164 | 2.50% | fixtured |
| code-03 | code | calibration | 151 | 151 | — | 55 | 54 | -1.82% | fixtured |
| code-04 | code | holdout | 268 | 268 | — | 93 | 94 | 1.08% | fixtured |
| code-05 | code | calibration | 182 | 182 | — | 65 | 64 | -1.54% | fixtured |
| code-06 | code | holdout | 310 | 310 | — | 106 | 108 | 1.89% | fixtured |
| code-07 | code | calibration | 251 | 251 | — | 87 | 88 | 1.15% | fixtured |
| code-08 | code | holdout | 297 | 297 | — | 102 | 103 | 0.98% | fixtured |
| code-09 | code | calibration | 227 | 227 | — | 80 | 80 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | — | 120 | 123 | 2.50% | fixtured |

**OSS / ローカル（Qwen2.5）**（`@cf/qwen/qwen2.5-coder-32b-instruct`、正確な自己BPE、正解データ: usage-field-probe、プローブ費用 $0.0000）

キャリブレーション: ラッパーオーバーヘッド 7 トークン; tokens/char english 1.0000, japanese 3.0000, code 1.0000（推定系はこれらの値を用いて予測を行い、正確系はこれらを記述統計として報告する）。

| クラス | ホールドアウト数 | 平均絶対誤差 | 最大絶対誤差 | 符号付き帯域 | 目標内 |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| サンプル | クラス | 役割 | 文字数 | UTF-8バイト数 | 自己コンテンツ | APIトータル | 予測値 | 誤差 | 出所 |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 167 | 174 | 174 | 0.00% | fixtured |
| en-02 | english | holdout | 236 | 236 | 236 | 243 | 243 | 0.00% | fixtured |
| en-03 | english | calibration | 271 | 271 | 271 | 278 | 278 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | 365 | 372 | 372 | 0.00% | fixtured |
| en-05 | english | calibration | 259 | 259 | 259 | 266 | 266 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-07 | english | calibration | 300 | 302 | 302 | 309 | 309 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | 237 | 244 | 244 | 0.00% | fixtured |
| en-09 | english | calibration | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-10 | english | holdout | 320 | 320 | 320 | 327 | 327 | 0.00% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | 228 | 235 | 235 | 0.00% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | 249 | 256 | 256 | 0.00% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | 255 | 262 | 262 | 0.00% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | 440 | 447 | 447 | 0.00% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | 324 | 331 | 331 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | 254 | 261 | 261 | 0.00% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | 358 | 365 | 365 | 0.00% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | 282 | 289 | 289 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | 270 | 277 | 277 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | 384 | 391 | 391 | 0.00% | fixtured |
| code-01 | code | calibration | 204 | 204 | 204 | 211 | 211 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | 477 | 484 | 484 | 0.00% | fixtured |
| code-03 | code | calibration | 151 | 151 | 151 | 158 | 158 | 0.00% | fixtured |
| code-04 | code | holdout | 268 | 268 | 268 | 275 | 275 | 0.00% | fixtured |
| code-05 | code | calibration | 182 | 182 | 182 | 189 | 189 | 0.00% | fixtured |
| code-06 | code | holdout | 310 | 310 | 310 | 317 | 317 | 0.00% | fixtured |
| code-07 | code | calibration | 251 | 251 | 251 | 258 | 258 | 0.00% | fixtured |
| code-08 | code | holdout | 297 | 297 | 297 | 304 | 304 | 0.00% | fixtured |
| code-09 | code | calibration | 227 | 227 | 227 | 234 | 234 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | 354 | 361 | 361 | 0.00% | fixtured |

**エッジケースプローブ**

- Anthropicのツール定義オーバーヘッド（count_tokensでツールありとなしを比較）：このパスでは測定していない
- —×—のPNGに対するAnthropicの画像トークン数（公開されている計算式 width×height/750）：このパスでは測定していない
- 同じPNGに対するGeminiの画像トークン数（ドキュメントに記載の384pxまで1画像あたり258）：このパスでは測定していない
- エッジプローブはリアルパスでのみ実行される（ライブのcountエンドポイントを読み取るため）

このベンチマークステージのプローブ費用: $0.0000（countエンドポイントは課金対象外であり、usageプローブは最小限のコンプリーションに対して課金される）

完全な実行記録は[`token-metering-comparison.data.json`](./token-metering-comparison.data.json)としてコミットされている：サンプルごとのカウント、フィッティング済みキャリブレーション、クラスごとの帯域、エッジプローブの読み取り値、および費用。

生成日時: 2026-01-01T00:00:00.000Z

**過去の調査 / Past surveys in this series**

このトピックに関する過去の日付付き調査（新しい順）— それぞれがその実行時点での完全な記事となっている。

- [2026-07-17T03:02:34.699Z](./history/token-metering/2026-07-17T03-02-34-699Z/token-metering-comparison)

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-17T03:02:34.699Z](./history/token-metering/2026-07-17T03-02-34-699Z/token-metering-comparison.ja)
