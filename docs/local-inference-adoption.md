<script setup>
import AdoptionRecovery from './.vitepress/theme/AdoptionRecovery.vue'
import recoveryFixture from '../packages/tech/src/adoption-recovery/fixtures/missing-metrics.json'
</script>

# Local inference adoption — 再計測要求

速度・品質・固定 tier のメモリ余白は、同じ実行の証拠がそろうまで採否未確定です。このページの合成欠測行では、TTFT の `MEASURE-FAILED` とピーク RSS の `NO-FIELD` から同じ条件の再計測要求を作成・再作成できます。実測の採用結果は示していません。

<AdoptionRecovery :context="recoveryFixture" />

## 要求を保存する

`packages/tech` で、ページからダウンロードした `adoption-recovery-intent.json` を渡します。元計測 JSON の保存先と信頼する比較コンテキストは運用者が指定します。JSON のフィールドからコマンド・パスを組み立てることはありません。

```sh
node --import tsx/esm src/entrypoints/save-adoption-recovery.ts \
  /path/to/result.json \
  src/adoption-recovery/fixtures/missing-metrics.json \
  adoption-recovery-intent.json > saved-request.json
```

この例の比較コンテキストは公開された合成 fixture です。`/path/to/result.json` は runner が保存した元計測 JSON に置き換えてください。対応する `.execution.json` が必要で、CLI は計測と同じ execution lock 内で要求を更新します。実測を接続する場合は、発行側が検証した元 snapshot と期待する execution ID/版・fixture SHA-256・commit・runner・固定 tier を別途用意します。アップロードされた要求から期待値を作ってはいけません。

再作成には `saved-request.json` を同じ欠測行に読み込んでください。期限内は再作成できません。期限切れまたは期限のない旧形式だけが再作成候補になります。CLI は現在保存されている要求をロック内で再確認するため、古いファイルから新しい世代を上書きできません。同じ送信の再試行は同じ要求 ID を返し、有効期限を延長しません。別の計測が始まった元 execution や、すでに置換された古い要求 ID は拒否します。

ブラウザは保存済み世代の権威ではありません。ページの期限判定は案内であり、CLI の時計とストアが最終判定を行います。別 tier・別 execution・別 fixture・異なる欠測理由・runner 版の不一致は拒否します。破損した要求は修復せず、固定エラーで停止します。要求の生成・保存はいずれも推論実行やジョブ投入を行いません。
