# local-inference domain

## 欠測理由（`metrics` の `reason`）

欠測の値は `null` で、ゼロで補いません。実測 0（例：初回 0 ms の TTFT 0 秒）は欠測ではなく実測値です。

| 理由 | 意味 | `metrics` が付ける条件 |
| --- | --- | --- |
| `NO-FIELD` | 観測にその項目が無かった | 失敗扱いでなく、必要な観測（firstMs・lastMs・completionTokens）が欠けているとき。tps は lastMs が firstMs 以下のときも該当 |
| `NOT-RUN` | この計測は実行していない | `startup_time` と `peak_rss`（常に） |
| `MEASURE-FAILED` | 計測を試みたが失敗した | 失敗扱い（`failed = true`）のとき、観測値があっても ttft・completion_tokens・tps の全項目 |
