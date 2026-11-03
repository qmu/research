# tech-minor-and-patch 更新（#298）の版差

PR #298 の本文の表を転記したものです（試験は未実行）。

| パッケージ | 現在 | 更新後 | 差 |
| --- | --- | --- | --- |
| @aws-sdk/client-s3vectors | 3.1111.0 | 3.1156.0 | minor |
| @google/genai | 2.17.1 | 2.31.0 | minor |
| openai | 7.4.0 | 7.43.0 | minor |
| playwright | 1.62.1 | 1.64.1 | minor |
| @types/node | 26.2.0 | 26.6.5 | minor |
| eslint | 10.8.1 | 10.13.0 | minor |
| prettier | 3.9.6 | 3.9.10 | patch |
| tsx | 4.23.12 | 4.23.15 | patch |
| typescript-eslint | 8.67.0 | 8.72.0 | minor |

major の変更はありません。取り込み時の確認: `make test`、`make lint`、`make lockfiles`。
