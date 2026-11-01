# 開いている PR の取り込み順（案）

PR 本文の記載に基づく依存関係です。実装の再確認は各 PR の CI で行います。

## 依存の連鎖（TTFT・採否）

1. qmu/research#277 ピークRSS保存（#183・#271 を前提に含む）
2. qmu/research#279 TTFT取得理由と runId の保存（#277 を前提）
3. qmu/research#281 TTFT取得失敗の固定理由（#279 を前提）
4. qmu/research#280 保存済みTTFTの採否ページ接続（#244 を前提）
5. qmu/research#284 取得可否の採否行への接続（#280・#281 を前提）
6. qmu/research#286 保存TTFTを採否計算へ接続（#284 を前提）

## 独立しているもの

- qmu/research#278 子孫RSSピーク（#277 の HTTP 計測とは別）
- qmu/research#285 比較実行の原子的保存
- qmu/research#283 ピークRSS再計測要求
- qmu/research#282 散布図
- テストのみ: qmu/research#299、qmu/research#300、qmu/research#301

## 提案する順

上の連鎖は番号順に、前提が main に入ってから次を main 向けへ付け替えて統合します。独立したものは連鎖と並行して統合できます。
