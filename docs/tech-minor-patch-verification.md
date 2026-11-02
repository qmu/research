# packages/tech の tech-minor-and-patch 更新（#298）の基準結果

対象: qmu/research#298（@aws-sdk/client-s3vectors、@google/genai、openai、playwright、@types/node、eslint、prettier、tsx、typescript-eslint の 9 件）。

## 適用前の基準（main の lockfile）

| コマンド | 結果 |
| --- | --- |
| `npm --prefix packages/tech ci --ignore-scripts` | 成功（284 packages） |
| `npm --prefix packages/tech run build`（tsc） | 成功、exit 0 |

バージョン差で注意するもの: @google/genai 2.17.1→2.31.0、openai 7.4.0→7.43.0、eslint 10.8.1→10.13.0。いずれも semver 上は minor であり、型定義の変更があれば tsc で失敗する。

## 更新適用後に流す手順（未実行）

1. #298 のブランチで `npm --prefix packages/tech ci`
2. `make build test lint`
3. `make lockfiles`（manifest の書き換えが無いこと）
