---
source_artifact: llm-model-comparison.real.data.json
source_commit: 834ade8
insights_model: claude-sonnet-5
translated_from: llm-model-comparison.insights.md
translation_model: claude-sonnet-5
generated_at: 2026-07-08T20:41:22.634Z
trials: 1
provenance: llm-translation
---
この成果物において最も意思決定に直結するパターンは、**エフォート/推論レベルを上げても品質が確実に向上するわけではない**という点である――むしろ基本的な指示追従を犠牲にしてわずかなスループット向上と引き換えにすることが多く、時には出力の整合性そのものを損なうこともある。例えば、Gemini 3.5 Flashはmediumエフォートで254.7 tok/sのスループットを記録したが、lengthAccuracyはわずか0.27にとどまり、highエフォートではさらに0.15まで低下した。一方でlowエフォートの同モデルは、やや遅い(267 tok/s)ものの依然として高速な速度を保ちながら、lengthAccuracyは1.0という完璧なスコアを記録している。同様に、Claude Sonnet 5は「xhigh」エフォートでlengthAccuracyが0となり、出力が目に見えて切り詰められていた(長さ計測プローブに対して`""`が返された)。また、o4-miniは「high」エフォートでlengthAccuracyが0となり、加えて崩れたJSONの中に本来含まれるべきでない推論テキスト("Oops invalid... need correct JSON")がレスポンス本文に漏れ出す事象も確認された。これは、出力の長さやフォーマットに厳密な制約があるタスクにおいては、エフォートを上げることが信頼性を改善するどころか、むしろ測定可能な形で*低下*させ得ることを示唆している――「より深く考えさせる」ことが常に安全だと決めつける前に、検証する価値のある直感に反する結果である。

第二に、構造化出力における上限は、大部分が**プロバイダー/プラットフォーム側の制約であり、モデル本来の能力を示す指標ではない**という点である。OpenAIのResponses/Chat APIは、モデルの階層にかかわらず、10段階を超えるネストを持つスキーマを一律にハードリジェクトする(`400 Invalid schema... 16 levels of nesting exceeds limit of 10`)――これはGPT-5.5、GPT-5.4、GPT-5.4-mini/nano、o4-miniのいずれにも同様に影響していた。GoogleのGeminiモデル群も15段階前後で同様の壁にぶつかる(`400 Request contains an invalid argument`)が、フィールド数(幅)については192個まで問題なく処理できていた。AnthropicのClaudeファミリーにはAPI側のハードな上限は存在しなかったが、その代わりに深さ22〜32あたりからタイムアウトや503エラーという形で挙動が劣化していった。
