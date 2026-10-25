<script setup lang="ts">
import { ref } from "vue";
import type {
  RecoverableResult,
  RemeasurementBinding,
} from "../../../packages/tech/src/local-inference/domain/remeasurement";
import {
  createAdoptionIntent,
  missingRows,
  inspectAdoptionRequest,
  recreateAdoptionIntent,
} from "../../../packages/tech/src/adoption-recovery/domain/intent";

const props = defineProps<{
  context: { binding: RemeasurementBinding; result: RecoverableResult };
}>();
const fixture = props.context;
const rows = missingRows(fixture.result, fixture.binding);
const open = ref(false);
const previous = ref<unknown>(null);
const message = ref("");
const output = ref("");
const status = ref("");
const canRecreate = ref(false);
function showError(error: unknown) {
  message.value =
    error instanceof Error && /^[A-Z][A-Z0-9-]{1,63}$/.test(error.message)
      ? error.message
      : "INVALID-RECOVERY-INPUT";
  output.value = "";
  canRecreate.value = false;
}
function openRecovery() {
  open.value = true;
  if (fixture.result.remeasurementRequest) {
    try {
      readPrevious(fixture.result.remeasurementRequest);
    } catch (error) {
      showError(error);
    }
  }
}
function readPrevious(value: unknown) {
  const state = inspectAdoptionRequest(
    fixture.result,
    fixture.binding,
    value,
    Date.now(),
  );
  previous.value = value;
  status.value = state.reason ?? "active（有効期限内）";
  canRecreate.value =
    state.status === "expired" && state.generation < Number.MAX_SAFE_INTEGER;
  message.value = canRecreate.value
    ? "同じ欠測行の期限切れ要求です。再作成用ファイルを生成できます。"
    : "有効な要求の期限は延長できません。";
}
function generate(recreate = false) {
  try {
    const intent = recreate
      ? recreateAdoptionIntent(
          fixture.result,
          fixture.binding,
          previous.value,
          Date.now(),
        )
      : createAdoptionIntent(fixture.result, fixture.binding);
    output.value = JSON.stringify(intent, null, 2) + "\n";
    message.value = recreate
      ? "再作成用ファイルを生成しました。保存時に最新世代と期限を再検証します。"
      : "作成用ファイルを生成しました。CLI で保存すると要求が確定します。";
  } catch (error) {
    showError(error);
  }
}
async function load(event: Event) {
  output.value = "";
  previous.value = null;
  canRecreate.value = false;
  status.value = "";
  try {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 65536) throw new Error("INVALID-RECOVERY-INPUT");
    const value = JSON.parse(await file.text());
    readPrevious(value);
  } catch (error) {
    showError(error);
  }
}
function download() {
  const url = URL.createObjectURL(
    new Blob([output.value], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "adoption-recovery-intent.json";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section aria-labelledby="missing-reason">
    <h2 id="missing-reason">欠測理由と次の操作</h2>
    <p>
      合成データ・実測値ではありません。TTFT・ピーク RSS
      の欠測により採否は未確定です。
    </p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Engine / run</th>
            <th>固定 tier</th>
            <th>指標</th>
            <th>欠測理由</th>
            <th>次の操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.runId + row.metric">
            <td>{{ row.engine }} / {{ row.runId }}</td>
            <td>{{ fixture.binding.fixedTier.label }}</td>
            <td>{{ row.metric }}</td>
            <td>{{ row.reason }}</td>
            <td>
              <button class="recovery-button" @click="openRecovery">
                再計測要求を開く
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <section
      v-if="open"
      id="recovery"
      aria-labelledby="recovery-title"
      class="recovery-panel"
    >
      <h3 id="recovery-title" tabindex="-1">同じ欠測行の再計測要求</h3>
      <dl>
        <dt>元 execution</dt>
        <dd>{{ fixture.binding.execution.runId }}</dd>
        <dt>対象 commit</dt>
        <dd>{{ fixture.binding.targetCommit }}</dd>
        <dt>Runner / fixture SHA-256</dt>
        <dd>
          {{ fixture.binding.runnerVersion }} /
          {{ fixture.binding.fixtureSha256 }}
        </dd>
        <dt>固定 tier</dt>
        <dd>
          {{ fixture.binding.fixedTier.label }} ({{
            fixture.binding.fixedTier.totalMiB
          }}
          MiB)
        </dd>
      </dl>
      <p>
        元の run と成果物を保管し、新しい run ID
        と出力先で再計測します。要求の既定期限は保存から24時間です。
      </p>
      <button class="recovery-button" @click="generate(false)">
        要求ファイルを作成
      </button>
      <p>
        <label for="previous-request"
          >再作成：CLI が返した保存済み要求 JSON を読み込む</label
        >
      </p>
      <input
        id="previous-request"
        type="file"
        accept="application/json,.json"
        @change="load"
      />
      <p v-if="status">要求の状態：{{ status }}</p>
      <button
        class="recovery-button"
        :disabled="!canRecreate"
        @click="generate(true)"
      >
        期限切れ要求を再作成
      </button>
      <p role="status" aria-live="polite">{{ message }}</p>
      <div v-if="output">
        <button class="recovery-button" @click="download">
          JSON をダウンロード
        </button>
        <details>
          <summary>生成した要求の内容</summary>
          <pre>{{ output }}</pre>
        </details>
        <p>
          ダウンロードした JSON を下の CLI で保存します。古い世代・別 tier・別
          run・異なる理由は保存前に拒否します。ファイル生成だけでは保存や推論は実行されません。
        </p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.table-scroll table {
  display: table;
  width: 100%;
  min-width: 620px;
  margin: 0;
  overflow: visible;
}
.table-scroll th,
.table-scroll td {
  white-space: nowrap;
}
.table-scroll {
  overflow-x: auto;
}
.recovery-panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}
.recovery-button {
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  padding: 7px 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.recovery-button:disabled {
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
  cursor: not-allowed;
}
.recovery-button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}
dt {
  font-weight: 600;
  margin-top: 8px;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
