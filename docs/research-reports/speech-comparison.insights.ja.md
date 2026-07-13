---
title: 音声 (TTS/STT/STS)
source_artifact: docs/research-reports/speech-comparison.data.json
insights_model: source-report
translated_from: speech-comparison.md
translation_model: hand-authored
generated_at: 2026-01-01T00:00:00.000Z
trials: 0
provenance: hand-translation
---
# 音声 (TTS/STT/STS)

このレポートは、音声APIを**機械的に検証可能な**挙動のみで比較します——固定された音声認識（STT）ジャッジが合成音声を書き起こし、参照テキストとの単語精度を算出する方式であり、自然さ（MOS）などの主観的な聴取評価はスコアに一切含まれません。

## 1. 調査の目的

本調査の目的は、音声合成（TTS）・音声認識（STT）・音声対話（STS）にまたがってどのような音声APIが存在し、それぞれの単価がいくらで、呼び出しがどれほど高速に返り、音声がどれほど正確に書き起こされるか——つまり、統合方式の選定を左右する特性を記録することである。

## 2. 測定対象

### 対象モデル

対象は、選定済みレジストリ（`packages/tech/src/speech/models.ts`）に含まれる音声モデルであり、音声合成および音声認識のAPIが、それぞれ引用元および最終確認日と共に掲載されている。音声対話（STS）はリアルタイム対応の能力として第7節にカタログ化している。

- **Anthropic** は対象外である：音声APIを提供していない（Claude はテキスト／画像の入力のみを受け付け、テキストを返す。2026-07-14時点で確認済み）。

### 対象メトリクス

測定対象のメトリクスは、呼び出しレイテンシ（ms、低いほど良い）、音声合成の明瞭度（固定STTジャッジによる書き起こしと合成元テキストとの単語精度、高いほど良い）、音声認識の単語精度（参照テキストに対する 1 − 単語誤り率、高いほど良い）である。1文字あたり・1分あたりの価格は選定済みカタログデータ（参考情報）であり、実測値ではない。

## 3. 範囲と制約

- **機械的採点のみ。** 品質は参照テキストに対する単語精度であり、本計測器は自然さや声質を採点しない。STTジャッジ（`fixture-judge`）の差し替えは通常の更新ではなく、計測器の変更に相当する。
- マニフェストのバージョンは`1`：音声合成の発話3件、音声認識の参照クリップ3件。履歴は同一マニフェストバージョンの地点同士のみを接続する。
- **音声バイナリはコミットされない。** アーティファクトにはバイト長、タイミング、書き起こし、スコアが記録され、このページを再生成するのに十分な情報が含まれるが、音声そのものは含まれない。実際の音声認識実行は、参照クリップを `SPEECH_AUDIO_DIR` から読み込む（マニフェストに引用したパブリックドメインの出典を参照）。
- フィクスチャ経路はキー不要かつ決定論的である。この最初の計測器では実経路に OpenAI アダプタのみを配線している（他プロバイダーは初回実測トライアルで対応する）。実際の数値は、オーナーが承認済み上限内で実経路を実行した場合にのみ現れる（まず `--estimate` を実行すること）。
- 特定時点のもの：計測された挙動は `2026-01-01T00:00:00.000Z` 時点のAPIを反映している。カタログ価格は各行の最終確認日時点のものである。

## 4. 検証結果

今回の実行では、10件の対象行のうち **0件を測定** した（非測定行は `fixtured` によるハーネスチェック、または `error` 行であり、数値を捏造することは一切ない）。

**音声合成（TTS）** — 今回は測定済みの行なし。コミット済みのフィクスチャページがハーネスを証明している。第7節を参照。

**音声認識（STT）** — 今回は測定済みの行なし。コミット済みのフィクスチャページがハーネスを証明している。第7節を参照。

**音声対話（STS）** — カタログ化した4プロバイダーのうち4件がリアルタイム双方向APIを提供している。往復レイテンシは後続のトライアルで測定する。能力の一覧表は第7節に記載している。「最良」「最悪」は各メトリクスの方向（レイテンシは低いほど、明瞭度と単語精度は高いほど良い）に従う。

## 5. 考察

今回の実行では測定済みの行が存在せず、すべての対象がフィクスチャまたはエラーとなったため、モデル間の比較に関する主張は行わない。コミットされたフィクスチャページは、パイプラインの動作を証明するために存在するものであり、プロバイダーを比較するためのものではない。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャクライアント）:
npm run research -- speech --fixture

# コストプレビュー、その後オーナー限定の実実行（OpenAI アダプタ配線済み）:
npm run research -- speech --estimate
SPEECH_AUDIO_DIR=./audio OPENAI_API_KEY=... npm run research -- speech --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要でコストもかからない。実トライアルでは、音声合成は文字数に応じて課金され、加えて合成クリップごとに1回のSTTジャッジ読み取りが発生する。音声認識は音声の分数に応じて課金される（対象ごとのカタログ価格を参照）。合意された上限は1トライアルあたり$10であり、`--estimate` を先に実行する必要がある。

### クリーンアップ

外部リソースは作成されない。合成音声および参照音声は採点のためにメモリ上に保持され、その後破棄される。実行時にはローカルのMarkdown/JSON成果物のみが書き出されるため、コミット前にそれらを確認すること。

## 7. 検証データ

**対象ごとの結果**

| 対象 | プロバイダー | 能力 | 由来 | 価格 | ストリーミング | レイテンシ（平均±標準偏差） | 明瞭度 | 単語精度 | 備考 |
| ----- | -------- | ---- | ---- | ----- | --------- | ----------------- | ----- | ------- | ---- |
| OpenAI TTS-1 | openai | tts | fixtured | 15 USD/1M chars | yes | 130 ± 8 (n=3) | 100.0% ± 0.0% (n=3) | 未測定 |  |
| ElevenLabs Multilingual v2 | elevenlabs | tts | fixtured | 100 USD/1M chars | yes | 130 ± 8 (n=3) | 100.0% ± 0.0% (n=3) | 未測定 |  |
| Google Cloud Neural2 | google | tts | fixtured | 16 USD/1M chars | yes | 130 ± 8 (n=3) | 100.0% ± 0.0% (n=3) | 未測定 |  |
| Amazon Polly Neural | amazon | tts | fixtured | 16 USD/1M chars | yes | 130 ± 8 (n=3) | 100.0% ± 0.0% (n=3) | 未測定 |  |
| Deepgram Aura-2 | deepgram | tts | fixtured | 30 USD/1M chars | yes | 130 ± 8 (n=3) | 100.0% ± 0.0% (n=3) | 未測定 |  |
| OpenAI Whisper | openai | stt | fixtured | 0.006 USD/audio-minute | no | 120 ± 2 (n=3) | 未測定 | 100.0% ± 0.0% (n=3) |  |
| Deepgram Nova-3 | deepgram | stt | fixtured | 0.0077 USD/audio-minute | yes | 120 ± 2 (n=3) | 未測定 | 100.0% ± 0.0% (n=3) |  |
| AssemblyAI Universal | assemblyai | stt | fixtured | 0.0035 USD/audio-minute | yes | 120 ± 2 (n=3) | 未測定 | 100.0% ± 0.0% (n=3) |  |
| Google Cloud Speech-to-Text (Chirp) | google | stt | fixtured | 0.016 USD/audio-minute | yes | 120 ± 2 (n=3) | 未測定 | 100.0% ± 0.0% (n=3) |  |
| Amazon Transcribe | amazon | stt | fixtured | 0.006 USD/audio-minute | yes | 120 ± 2 (n=3) | 未測定 | 100.0% ± 0.0% (n=3) |  |

**音声対話（STS）の対応状況（カタログ）**

| プロバイダー | API | モデルID | 双方向リアルタイム | 確認日 | 出典 |
| -------- | --- | -------- | --------------- | -------- | ------ |
| OpenAI | Realtime API (GPT Realtime, GA) | gpt-realtime | yes | 2026-07-14 | https://developers.openai.com/api/docs/models/gpt-realtime |
| Google | Gemini Live API (2.5 Flash Native Audio) | gemini-2.5-flash-native-audio-preview-12-2025 | yes | 2026-07-14 | https://ai.google.dev/gemini-api/docs/live |
| AWS | Bedrock Nova Sonic (legacy; Nova 2 Sonic successor) | amazon.nova-sonic-v1:0 | yes | 2026-07-14 | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-sonic.html |
| xAI | Grok Voice Agent API | grok-voice-latest | yes | 2026-07-14 | https://docs.x.ai/developers/model-capabilities/audio/voice-agent |

**発話マニフェスト（バージョン 1）**

| 発話ID | 種類 | テキスト／参照 |
| --------- | ---- | ------------- |
| tts-pangram | tts | The quick brown fox jumps over the lazy dog |
| tts-clarity | tts | She sells seashells by the seashore on a sunny day |
| tts-common | tts | Please remember to bring your umbrella and jacket tomorrow |
| stt-birch | stt | The birch canoe slid on the smooth planks |
| stt-glue | stt | Glue the sheet to the dark blue background |
| stt-depth | stt | It is easy to tell the depth of a well |

**ジャッジの由来。** すべての音声合成出力は `fixture-judge` によって読み取られ、各呼び出しの書き起こしとスコアは、アーティファクト内に逐語的に保存されています。

完全な実行記録は [`speech-comparison.data.json`](./speech-comparison.data.json) としてコミットされています。呼び出しごとのレイテンシ、音声バイト長、書き起こし、スコアが含まれます。

生成日時: 2026-01-01T00:00:00.000Z
