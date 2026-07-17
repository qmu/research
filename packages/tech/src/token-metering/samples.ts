import type { TokenSample } from "./domain/types";

/**
 * The pinned sample manifest the accuracy target (±5 %) is stated over. Version
 * `tm-v1`: 30 committed samples — 10 English, 10 Japanese, 10 code — split
 * alternately into 5 calibration + 5 holdout per class. Calibration rows fit
 * each family's wrapper overhead and (for estimator families) per-class
 * tokens-per-character rates; holdout rows measure the reported error. The plgg
 * library ticket reuses this exact set as its fixture, so ids and texts are
 * frozen: changing a sample is a manifest version bump, never a silent edit.
 *
 * Texts are self-authored for this manifest (no third-party corpus), so the
 * repository stays free of external text licenses.
 */
export const TOKEN_SAMPLES_VERSION = "tm-v1";

/** The agreed accuracy target: |error| ≤ 5 % on every holdout class. */
export const ACCURACY_TARGET_PCT = 5;

export const TOKEN_SAMPLES: ReadonlyArray<TokenSample> = [
  // --- english ---------------------------------------------------------
  {
    id: "en-01",
    class: "english",
    role: "calibration",
    text: "Token counting decides what an API call costs before the call is made. A metering layer that cannot count tokens cannot attribute spend to the principal who caused it.",
  },
  {
    id: "en-02",
    class: "english",
    role: "holdout",
    text: "The invoice arrived three weeks late, and by then the finance team had already closed the quarter. Nobody could say which department had approved the original purchase order, so the amount sat in a suspense account until the next audit.",
  },
  {
    id: "en-03",
    class: "english",
    role: "calibration",
    text: "Rate limits are enforced per organization, not per user. When a burst of requests exceeds the configured ceiling, the gateway returns a 429 response with a Retry-After header, and well-behaved clients back off exponentially with jitter before retrying the failed request.",
  },
  {
    id: "en-04",
    class: "english",
    role: "holdout",
    text: "She walked along the harbor wall at dusk, counting the fishing boats as they came in. Seventeen tonight — two fewer than yesterday. The wind had turned during the afternoon and smelled of rain, and the gulls had gone quiet, which the old men on the pier always said meant a storm before morning. She pulled her coat tighter and kept walking toward the lighthouse.",
  },
  {
    id: "en-05",
    class: "english",
    role: "calibration",
    text: "Q3 revenue grew 14% year over year to $8.2M, driven by a 31% increase in enterprise subscriptions. Gross margin held at 71%. Operating expenses rose 9%, primarily headcount in engineering (12 hires) and the SOC 2 Type II audit fee. Net retention reached 118%.",
  },
  {
    id: "en-06",
    class: "english",
    role: "holdout",
    text: "To reset the device, hold the power button for ten seconds until the indicator blinks amber, then release. The device restores factory settings, reboots twice, and broadcasts a setup network named after its serial number. Connect to that network and open the configuration page at the default gateway address.",
  },
  {
    id: "en-07",
    class: "english",
    role: "calibration",
    text: "A byte-pair encoder builds its vocabulary by repeatedly merging the most frequent adjacent symbol pair in a training corpus. At inference time the merges are replayed in rank order, so the same text always produces the same token sequence — determinism is what makes offline counting possible at all.",
  },
  {
    id: "en-08",
    class: "english",
    role: "holdout",
    text: "Thanks for the quick turnaround! Two small things before we ship: the header still says 2025 in the footer copyright, and the pricing table overflows on narrow screens. Otherwise looks great — approve from my side once those are fixed.",
  },
  {
    id: "en-09",
    class: "english",
    role: "calibration",
    text: "The committee reviewed the proposal in light of the applicable procurement regulations, noting that the threshold for competitive tendering had been exceeded and that, consequently, a direct award would require a documented exemption signed by the accounting officer and retained for a minimum of seven years.",
  },
  {
    id: "en-10",
    class: "english",
    role: "holdout",
    text: "Migration checklist: freeze writes on the old cluster, take a final snapshot, replay the write-ahead log up to the freeze point, flip the DNS record with a 60-second TTL, watch error rates for fifteen minutes, then decommission the old primary. Roll back by reversing the DNS flip; the snapshot stays valid for 24 hours.",
  },
  // --- japanese --------------------------------------------------------
  {
    id: "ja-01",
    class: "japanese",
    role: "calibration",
    text: "トークン数の把握は、API呼び出しの費用を呼び出す前に見積もるための前提である。利用者ごとの使用量を集計する仕組みは、トークンを数えられなければ成立しない。",
  },
  {
    id: "ja-02",
    class: "japanese",
    role: "holdout",
    text: "請求書の締め日は毎月末日、支払期日は翌月末日とする。振込手数料は支払側の負担とし、期日までに入金が確認できない場合は、担当者へ連絡のうえ翌営業日までに対応を協議する。",
  },
  {
    id: "ja-03",
    class: "japanese",
    role: "calibration",
    text: "夕方の商店街は買い物客でにぎわっていた。八百屋の店先には秋の野菜が並び、隣の魚屋からは威勢のいい呼び込みの声が聞こえる。子どもたちが路地を駆け抜け、自転車のベルが鳴った。",
  },
  {
    id: "ja-04",
    class: "japanese",
    role: "holdout",
    text: "本機能を利用するには、管理画面で二段階認証を有効にしてください。設定後、登録済みのメールアドレスに確認コードが送信されます。コードの有効期限は10分間です。期限切れの場合は再送信ボタンから新しいコードを取得してください。なお、五回連続で誤ったコードを入力するとアカウントは一時的にロックされます。",
  },
  {
    id: "ja-05",
    class: "japanese",
    role: "calibration",
    text: "御社ますますご清栄のこととお慶び申し上げます。さて、先日ご依頼いただきました見積書を添付のとおりお送りいたします。ご不明な点がございましたら、担当までお気軽にお問い合わせください。今後ともよろしくお願い申し上げます。",
  },
  {
    id: "ja-06",
    class: "japanese",
    role: "holdout",
    text: "会議は10時に始まった。議題は三つ。第一に来期の予算配分、第二に新製品の発売時期、第三に採用計画である。予算については営業部と開発部の要求が重なり、結論は持ち越しとなった。",
  },
  {
    id: "ja-07",
    class: "japanese",
    role: "calibration",
    text: "日本語のテキストは、英語に比べて1文字あたりのトークン数が多くなる傾向がある。語彙に含まれない漢字はバイト単位に分解されるため、同じ意味内容でも課金対象のトークン数は増える。この特性は、多言語プロダクトの費用見積もりで無視できない差になる。",
  },
  {
    id: "ja-08",
    class: "japanese",
    role: "holdout",
    text: "新幹線は定刻に東京駅を出発した。窓側の席に座り、弁当を広げる。富士山が見えるのは静岡を過ぎたあたりだと隣の乗客が教えてくれた。あいにくの曇り空だったが、名古屋に着くころには日が差し始めた。",
  },
  {
    id: "ja-09",
    class: "japanese",
    role: "calibration",
    text: "障害発生時は、まず影響範囲を特定し、次に一次対応として該当サービスを縮退運転へ切り替える。復旧後は時系列で経緯を整理し、再発防止策とあわせて障害報告書を三営業日以内に提出すること。",
  },
  {
    id: "ja-10",
    class: "japanese",
    role: "holdout",
    text: "春の展示会への出展が決まりました。ブースの位置は入口から二列目、小間番号はB-12です。設営は前日の午後3時から可能で、搬入口は建物北側にあります。当日はスタッフ4名体制で、交代で休憩を取りながら対応します。パンフレットは800部、ノベルティは500個を用意する予定です。",
  },
  // --- code ------------------------------------------------------------
  {
    id: "code-01",
    class: "code",
    role: "calibration",
    text: 'export const meter = (usage: Usage): Cost => {\n  const input = usage.inputTokens * PRICE.input;\n  const output = usage.outputTokens * PRICE.output;\n  return { total: input + output, currency: "USD" };\n};\n',
  },
  {
    id: "code-02",
    class: "code",
    role: "holdout",
    text: 'def count_tokens(text: str, vocab: dict[bytes, int]) -> int:\n    parts = [bytes([b]) for b in text.encode("utf-8")]\n    while True:\n        best = None\n        for i in range(len(parts) - 1):\n            rank = vocab.get(parts[i] + parts[i + 1])\n            if rank is not None and (best is None or rank < best[1]):\n                best = (i, rank)\n        if best is None:\n            return len(parts)\n        i = best[0]\n        parts[i : i + 2] = [parts[i] + parts[i + 1]]\n',
  },
  {
    id: "code-03",
    class: "code",
    role: "calibration",
    text: '{\n  "model": "gpt-5.5",\n  "messages": [{ "role": "user", "content": "Hello" }],\n  "max_completion_tokens": 16,\n  "temperature": 0,\n  "stream": false\n}\n',
  },
  {
    id: "code-04",
    class: "code",
    role: "holdout",
    text: "SELECT principal_id,\n       SUM(input_tokens)  AS input_tokens,\n       SUM(output_tokens) AS output_tokens,\n       SUM(cost_usd)      AS cost_usd\nFROM usage_records\nWHERE recorded_at >= date_trunc('month', now())\nGROUP BY principal_id\nORDER BY cost_usd DESC\nLIMIT 20;\n",
  },
  {
    id: "code-05",
    class: "code",
    role: "calibration",
    text: '#!/usr/bin/env bash\nset -euo pipefail\n\nfor topic in $(node ./list-topics.js); do\n  echo "==> ${topic}"\n  npm run research -- "${topic}" --fixture\ndone\n\ngit diff --exit-code -- docs/\n',
  },
  {
    id: "code-06",
    class: "code",
    role: "holdout",
    text: 'type Brand<T, B extends string> = T & { readonly __brand: B };\ntype TokenCount = Brand<number, "TokenCount">;\ntype UsdAmount = Brand<number, "UsdAmount">;\n\nconst tokenCount = (n: number): TokenCount => {\n  if (!Number.isInteger(n) || n < 0) throw new Error("invalid token count");\n  return n as TokenCount;\n};\n',
  },
  {
    id: "code-07",
    class: "code",
    role: "calibration",
    text: 'func (m *Meter) Record(ctx context.Context, r UsageRecord) error {\n\tif r.PrincipalID == "" {\n\t\treturn ErrMissingPrincipal\n\t}\n\tm.mu.Lock()\n\tdefer m.mu.Unlock()\n\tm.totals[r.PrincipalID] += r.InputTokens + r.OutputTokens\n\treturn m.store.Append(ctx, r)\n}\n',
  },
  {
    id: "code-08",
    class: "code",
    role: "holdout",
    text: '<form method="post" action="/api/quota">\n  <label for="ceiling">Monthly ceiling (USD)</label>\n  <input id="ceiling" name="ceiling" type="number" min="0" step="0.01" required />\n  <button type="submit">Save</button>\n</form>\n<style>\n  form { display: grid; gap: 0.5rem; max-width: 20rem; }\n</style>\n',
  },
  {
    id: "code-09",
    class: "code",
    role: "calibration",
    text: "# Usage metering configuration\nmetering:\n  enabled: true\n  aggregation_window: 1h\n  attribution: principal\n  export:\n    format: openmetrics\n    endpoint: /metrics\n  retention:\n    raw_records_days: 90\n    aggregates_days: 730\n",
  },
  {
    id: "code-10",
    class: "code",
    role: "holdout",
    text: 'import { describe, expect, it } from "vitest";\nimport { estimateCost } from "./cost";\n\ndescribe("estimateCost", () => {\n  it("prices input and output tokens separately", () => {\n    const cost = estimateCost({ inputTokens: 1000, outputTokens: 200 });\n    expect(cost.inputUsd).toBeCloseTo(0.003);\n    expect(cost.outputUsd).toBeCloseTo(0.003);\n  });\n});\n',
  },
];
