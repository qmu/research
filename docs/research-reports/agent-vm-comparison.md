---
title: Agent VM / sandbox comparison
description: A reproducible comparison of agent VM / sandbox platforms — isolation model, published price, capability envelope, and measured cold-start latency and fixed-task cost.
---

# Agent VM / sandbox comparison

This report compares the sandbox / microVM platforms an AI agent can run untrusted code in. Reference columns (isolation, price, capability) are curated from each provider's docs; the cold-start and cost columns are produced by a live probe, or by the keyless fixture on the self-test page.

## 1. Research Purpose

The purpose is to record which agent VM / sandbox platforms exist, how they isolate code, what they cost, and how quickly they boot — the properties that decide which backend an agent's code-execution layer is built on.

## 2. Measurement Targets

### Target Models

The subjects are the 8 providers in the curated registry (`packages/tech/src/agent-vm/models.ts`), each with a cited source and last-verified date.

- **AWS Lambda microVMs** (`aws-lambda-microvm`): firecracker isolation — source https://aws.amazon.com/lambda/pricing/ (verified 2026-07-14).
- **Fly.io Machines** (`fly-machines`): firecracker isolation — source https://fly.io/docs/about/pricing/ (verified 2026-07-14).
- **E2B** (`e2b`): firecracker isolation — source https://e2b.dev/docs/pricing (verified 2026-07-14).
- **Modal** (`modal`): gvisor isolation — source https://modal.com/pricing (verified 2026-07-14).
- **Daytona** (`daytona`): container isolation — source https://www.daytona.io/pricing (verified 2026-07-14).
- **Cloudflare Containers / Sandbox SDK** (`cloudflare-sandbox`): container isolation — source https://developers.cloudflare.com/containers/pricing/ (verified 2026-07-14).
- **Vercel Sandbox** (`vercel-sandbox`): firecracker isolation — source https://vercel.com/docs/vercel-sandbox (verified 2026-07-14).
- **Northflank Sandboxes** (`northflank`): kata isolation — source https://northflank.com/pricing (verified 2026-07-14).

### Target Metrics

Reference metrics (curated): isolation model, published $/vCPU-hr and $/GB-hr (lower is better), billing granularity, max runtime (higher is better), snapshot/resume, filesystem persistence, network egress, GPU availability. Measured metrics (probed): cold-start p50/p95 (ms, lower is better), warm-reuse latency (ms, lower is better), fixed-task wall-clock (ms, lower is better), and derived fixed-task cost (USD, lower is better).

## 3. Scope and Constraints

- **Stated isolation, not audited.** The isolation column records each vendor's documented boundary (Firecracker microVM, gVisor, Kata, container); this topic does not pen-test that boundary.
- **Prices are curated catalog data** at the standard tier and move often — every row carries a source and last-verified date and MUST be reconfirmed at trial time.
- **Cost is compute-time only.** The fixed-task cost prices the task's vCPU-seconds at the published rate; per-boot minimums, account fees, and egress are noted, not folded into the number.
- The fixture path is keyless and deterministic; real cold-start numbers appear only after an owner runs the real path with credentials, within the approved cost ceiling (run `--estimate` first). Providers without a probe adapter stay `unreachable` until one lands.
- Point-in-time: measured behavior reflects the platforms at `2026-01-01T00:00:00.000Z`; reference values are as of each row's last-verified date.

## 4. Verification Results

This run has **8 probed** of 8 provider rows (the rest are `unreachable` — no probe adapter/credential yet — or `error`, never faked numbers).

| Metric | Best (provider) | Median | Worst |
| ------ | --------------- | ------ | ----- |
| Cold start p50 | 92 ms — E2B | 408 ms | 2856 ms |
| Cold start p95 | 98 ms — E2B | 436 ms | 3052 ms |
| Fixed-task cost | $0.000001 — Northflank Sandboxes | $0.000002 | $0.000004 |

"Best"/"Worst" follow each metric's own direction (lower cold start and lower cost are better). The isolation model, published rate, and capability columns are reference data in the provider tables. The full per-provider records are in section 7, Verification Data.

## 5. Analysis

Rows with `fixtured`/`measured` provenance can be compared on cold start and cost; isolation, price, and capability are reference context. A low cold-start p50 with a high p95 localizes tail-latency risk; a cheap $/vCPU-hr with a slow boot trades responsiveness for cost.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture provisioner):
npm run research -- agent-vm --fixture

# Cost preview, then the owner-gated real run (needs provider credentials):
npm run research -- agent-vm --estimate
npm run research -- agent-vm --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each reachable provider for the vCPU-seconds of its boots and the fixed task (see the per-provider $/vCPU-hr in the reference table); the agreed range is $1–$8 per trial and `--estimate` must run first.

### Cleanup

A real adapter MUST tear down every sandbox it boots (zero orphaned resources, like the RAG teardown guarantee); the fixture path provisions nothing. The run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Reference catalog (curated)**

| Provider | Isolation | $/vCPU-hr | $/GB-hr | Billing | Max runtime | Snapshot | Filesystem | Egress | GPU |
| -------- | --------- | --------- | ------- | ------- | ----------- | -------- | ---------- | ------ | --- |
| AWS Lambda microVMs | firecracker | $0.10000 | $0.01100 | per-100ms | 900s | no | ephemeral | restricted | no |
| Fly.io Machines | firecracker | $0.02190 | $0.00530 | per-second | unbounded | yes | persistent | open | yes |
| E2B | firecracker | $0.10000 | $0.01080 | per-second | 86400s | yes | persistent | open | no |
| Modal | gvisor | $0.13500 | $0.00670 | per-second | 86400s | yes | persistent | open | yes |
| Daytona | container | $0.05000 | $0.01250 | per-second | unbounded | yes | persistent | open | yes |
| Cloudflare Containers / Sandbox SDK | container | $0.07200 | $0.00900 | per-second | unbounded | no | ephemeral | open | no |
| Vercel Sandbox | firecracker | $0.12800 | $0.02120 | per-second | 2700s | no | ephemeral | open | no |
| Northflank Sandboxes | kata | $0.01667 | $0.00833 | per-second | unbounded | yes | persistent | open | yes |

**Measured probe (fixed task: A bounded CPU loop (fixed iteration count) run inside a warm sandbox; wall-clock isolates platform compute, not I/O.)**

| Provider | Provenance | Cold p50 | Cold p95 | Cold (mean±sd) | Warm reuse | Fixed task | Task cost | Note |
| -------- | ---------- | -------- | -------- | -------------- | ---------- | ---------- | --------- | ---- |
| AWS Lambda microVMs | fixtured | 612 ms | 654 ms | 614 ± 27 (n=5) | 72 ms | 118 ms | $0.000003 |  |
| Fly.io Machines | fixtured | 2856 ms | 3052 ms | 2867 ± 126 (n=5) | 336 ms | 118 ms | $0.000001 |  |
| E2B | fixtured | 92 ms | 98 ms | 92 ± 4 (n=5) | 11 ms | 118 ms | $0.000003 |  |
| Modal | fixtured | 408 ms | 436 ms | 410 ± 18 (n=5) | 48 ms | 118 ms | $0.000004 |  |
| Daytona | fixtured | 153 ms | 164 ms | 154 ± 7 (n=5) | 18 ms | 118 ms | $0.000002 |  |
| Cloudflare Containers / Sandbox SDK | fixtured | 510 ms | 545 ms | 512 ± 23 (n=5) | 60 ms | 118 ms | $0.000002 |  |
| Vercel Sandbox | fixtured | 255 ms | 273 ms | 256 ± 11 (n=5) | 30 ms | 118 ms | $0.000004 |  |
| Northflank Sandboxes | fixtured | 1224 ms | 1308 ms | 1229 ± 54 (n=5) | 144 ms | 118 ms | $0.000001 |  |

The complete run record is committed as [`agent-vm-comparison.data.json`](./agent-vm-comparison.data.json): per-repetition cold-start samples, warm-reuse and fixed-task timings, and derived costs.

Generated: 2026-01-01T00:00:00.000Z
