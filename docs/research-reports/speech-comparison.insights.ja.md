---
title: 音声 (TTS/STT/STS)
source_artifact: docs/research-reports/speech-comparison.data.json
source_commit: f2d16c0
insights_model: source-report
translated_from: speech-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-18T15:25:18.526Z
trials: 0
provenance: llm-translation
---
# 音声 (TTS/STT/STS)

本レポートは、**機械的に検証可能な**挙動のみに基づいて音声APIを比較する — 固定の音声認識ジャッジが合成音声を読み取り、基準テキストと照合して単語正解率を算出する。自然さ（MOS）やその他の主観的な聴取評価はスコアに一切反映されない。

## 1. 調査の目的

目的は、テキスト読み上げ（text-to-speech）、音声認識（speech-to-text）、音声対音声（speech-to-speech）の各分野にどのような音声APIが存在するか、それぞれの単位あたりのコストはどれくらいか、呼び出しに対するレスポンス速度はどの程度か、そして音声の書き起こし精度はどれほどかという、統合方式の選定を左右する特性を記録することにある。

## 2. 測定対象

### 対象モデル

対象は、厳選されたレジストリ（`packages/tech/src/speech/models.ts`）に含まれる音声モデルである：テキスト読み上げ（text-to-speech）および音声認識（speech-to-text）APIであり、それぞれに出典と最終確認日が付されている。音声対音声（speech-to-speech）はリアルタイム機能として（第7節で）分類されている。

- **Anthropic**は対象外である：音声APIを提供していない（Claudeはテキスト／画像入力のみを受け付け、テキストを返す）（2026-07-14確認）。

### 対象メトリクス

測定するメトリクスは、呼び出しレイテンシ（ms、低いほど良い）、テキスト読み上げの明瞭性（固定のSTT判定器による書き起こしと合成対象テキストとの単語正解率、高いほど良い）、および音声認識の単語正解率（1 − 参照書き起こしに対する単語誤り率、高いほど良い）である。文字単価および分単価は、参考として掲載されたカタログデータであり、測定値ではない。

## 3. 範囲と制約

- **機械的な採点のみ。** 品質は参照テキストに対する単語一致率であり、本計測器が自然さや音声品質を採点することは一切ない。STT判定器（`whisper-1`）の差し替えは、通常の更新ではなく計測器自体の変更にあたる。
- マニフェストバージョン `1`：3件のテキスト読み上げ（text-to-speech）発話および3件の音声認識（speech-to-text）参照クリップ。履歴は同一マニフェストバージョンの地点同士のみを接続する。
- **音声バイナリはコミットされない。** アーティファクトが記録するのはバイト長、タイミング、書き起こし、スコアであり、これは本ページを再生成するのに十分な情報だが、音声そのものは含まれない。実際の音声認識実行では、`SPEECH_AUDIO_DIR` から参照クリップを読み込む（マニフェストが引用するパブリックドメインの出典を参照）。
- フィクスチャ経路はキー不要かつ決定的であり、この最初の計測器では実経路の配線がOpenAIアダプタのみに施されている（他プロバイダは最初の実トライアルの際に追加される）。実数値は、オーナーが承認された上限内で実経路を実行した後にのみ現れる（まず `--estimate` を実行すること）。
- 時点情報：計測された挙動は `2026-07-18T15:09:30.905Z` 時点のAPIを反映しており、カタログ価格は各行の最終確認日時点のものである。

## 4. 検証結果

今回の実行では、対象10行のうち**2行を測定済み**（未測定の行は `fixtured` によるハーネスチェックまたは `error` 行であり、数値を捏造することは一切ない）。

**音声合成（Text-to-speech）**

| メトリクス | 最良（モデル） | 中央値 | 最悪 |
| ------ | ------------ | ------ | ----- |
| 合成レイテンシ | 1679 ms — OpenAI TTS-1 | 1679 ms | 1679 ms |
| 明瞭度 | 100.0% — OpenAI TTS-1 | 100.0% | 100.0% |

**音声認識（Speech-to-text）**

| メトリクス | 最良（モデル） | 中央値 | 最悪 |
| ------ | ------------ | ------ | ----- |
| 文字起こしレイテンシ | 1124 ms — OpenAI Whisper | 1124 ms | 1124 ms |
| 単語正解率 | 95.8% — OpenAI Whisper | 95.8% | 95.8% |

**音声対音声（Speech-to-speech）** — カタログ化された4のプロバイダーのうち4がリアルタイム双方向APIを提供しており、往復レイテンシは後続の試行で測定される。全機能一覧は7節に記載している。「最良」「最悪」は各メトリクスの方向性（レイテンシは低いほど良く、明瞭度と単語正解率は高いほど良い）に従う。

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. 考察

`measured` の来歴を持つ行は、レイテンシと単語正解率について能力ごとに比較可能である。価格はカタログの参考情報にすぎない。text-to-speech の明瞭度と speech-to-text の単語正解率を対比することで、誤差がどこで生じているか——合成の明瞭さか、それとも認識の精度か——を特定できる。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャクライアント）:
npm run research -- speech --fixture

# コストの見積り、その後オーナー限定の実実行（OpenAIアダプター接続済み）:
npm run research -- speech --estimate
SPEECH_AUDIO_DIR=./audio OPENAI_API_KEY=... npm run research -- speech --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要でコストもかからない。実トライアルではテキスト読み上げ（text-to-speech）は文字数課金に加え、合成された各クリップに対する1回分のSTTジャッジ読み取りが発生し、音声認識（speech-to-text）は音声の分あたりで課金される（対象ごとのカタログ価格を参照）。合意された上限は1トライアルあたり$10であり、`--estimate` を先に実行する必要がある。

### クリーンアップ

外部リソースは作成されない。合成音声と参照音声はスコアリングのためにメモリ上に保持され、その後破棄される。実行時にはローカルのMarkdown/JSON成果物のみが書き出されるため、コミット前にそれらを確認すること。

## 7. 検証データ

**科目ごとの結果**

| Subject | Provider | Capability | Provenance | Price | Streaming | Latency (mean±sd) | Intelligibility | Word accuracy | Note |
| ------- | -------- | ---------- | ---------- | ----- | --------- | ----------------- | --------------- | ------------- | ---- |
| OpenAI TTS-1 | openai | tts | measured | 15 USD/1M chars | yes | 1679 ± 632 (n=9) | 100.0% ± 0.0% (n=9) | not measured |  |
| ElevenLabs Multilingual v2 | elevenlabs | tts | error | 100 USD/1M chars | yes | not measured | not measured | not measured | Error: ELEVENLABS_API_KEY is required for a real elevenlabs run. |
| Google Cloud Neural2 | google | tts | error | 16 USD/1M chars | yes | not measured | not measured | not measured | Error: Google TTS Neural2 failed: 401 {   "error": {     "code": 401,     "message": "API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal. See https://cloud.google.com/docs/authentication",     "status": "UNAUTHENTICATED",     "details": [       {         "@type": "type.googleapis.com/google.rpc.ErrorInfo",         "reason": "CREDENTIALS_MISSING",         "domain": "googleapis.com",         "metadata": {           "method": "google.cloud.texttospeech.v1.TextToSpeech.SynthesizeSpeech",           "service": "texttospeech.googleapis.com"         }       }     ]   } } |
| Amazon Polly Neural | amazon | tts | error | 16 USD/1M chars | yes | not measured | not measured | not measured | Error: real adapter for provider 'amazon' is not wired yet (Amazon needs AWS SigV4 + the Transcribe async-S3 design decision; tracked as a follow-up); run --fixture or select a wired provider. |
| Deepgram Aura-2 | deepgram | tts | error | 30 USD/1M chars | yes | not measured | not measured | not measured | Error: DEEPGRAM_API_KEY is required for a real deepgram run. |
| OpenAI Whisper | openai | stt | measured | 0.006 USD/audio-minute | no | 1124 ± 588 (n=9) | not measured | 95.8% ± 6.3% (n=9) |  |
| Deepgram Nova-3 | deepgram | stt | error | 0.0077 USD/audio-minute | yes | not measured | not measured | not measured | Error: DEEPGRAM_API_KEY is required for a real deepgram run. |
| AssemblyAI Universal | assemblyai | stt | error | 0.0035 USD/audio-minute | yes | not measured | not measured | not measured | Error: ASSEMBLYAI_API_KEY is required for a real assemblyai run. |
| Google Cloud Speech-to-Text (Chirp) | google | stt | error | 0.016 USD/audio-minute | yes | not measured | not measured | not measured | Error: Google STT chirp failed: 401 {   "error": {     "code": 401,     "message": "API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal. See https://cloud.google.com/docs/authentication",     "status": "UNAUTHENTICATED",     "details": [       {         "@type": "type.googleapis.com/google.rpc.ErrorInfo",         "reason": "CREDENTIALS_MISSING",         "domain": "googleapis.com",         "metadata": {           "method": "google.cloud.speech.v1.Speech.Recognize",           "service": "speech.googleapis.com"         }       }     ]   } } |
| Amazon Transcribe | amazon | stt | error | 0.006 USD/audio-minute | yes | not measured | not measured | not measured | Error: real adapter for provider 'amazon' is not wired yet (Amazon needs AWS SigV4 + the Transcribe async-S3 design decision; tracked as a follow-up); run --fixture or select a wired provider. |

**Speech-to-speech機能（カタログ）**

| Provider | API | Model id | Duplex realtime | Verified | Source |
| -------- | --- | -------- | --------------- | -------- | ------ |
| OpenAI | Realtime API (GPT Realtime, GA) | gpt-realtime | yes | 2026-07-14 | https://developers.openai.com/api/docs/models/gpt-realtime |
| Google | Gemini Live API (2.5 Flash Native Audio) | gemini-2.5-flash-native-audio-preview-12-2025 | yes | 2026-07-14 | https://ai.google.dev/gemini-api/docs/live |
| AWS | Bedrock Nova Sonic (legacy; Nova 2 Sonic successor) | amazon.nova-sonic-v1:0 | yes | 2026-07-14 | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-sonic.html |
| xAI | Grok Voice Agent API | grok-voice-latest | yes | 2026-07-14 | https://docs.x.ai/developers/model-capabilities/audio/voice-agent |

**発話マニフェスト（version 1）**

| Utterance id | Kind | Text / reference |
| ------------ | ---- | ---------------- |
| tts-pangram | tts | The quick brown fox jumps over the lazy dog |
| tts-clarity | tts | She sells seashells by the seashore on a sunny day |
| tts-common | tts | Please remember to bring your umbrella and jacket tomorrow |
| stt-birch | stt | The birch canoe slid on the smooth planks |
| stt-glue | stt | Glue the sheet to the dark blue background |
| stt-depth | stt | It is easy to tell the depth of a well |

**Judgeの証跡。** すべてのtext-to-speech出力は`whisper-1`によって読み上げられ、各呼び出しの文字起こしとスコアはアーティファクト内にそのまま保存されている。

完全な実行記録は[`speech-comparison.data.json`](./speech-comparison.data.json)としてコミットされている：呼び出しごとのレイテンシ、音声バイト長、文字起こし、スコアを含む。

生成日時: 2026-07-18T15:09:30.905Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-19T02:22:34.606Z](./history/speech/2026-07-19T02-22-34-606Z/speech-comparison.ja)
- [2026-07-18T15:09:30.905Z](./history/speech/2026-07-18T15-09-30-905Z/speech-comparison.ja)
