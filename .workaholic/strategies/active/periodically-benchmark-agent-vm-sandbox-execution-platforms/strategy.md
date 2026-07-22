---
type: Strategy
title: Periodically benchmark agent VM / sandbox execution platforms
slug: periodically-benchmark-agent-vm-sandbox-execution-platforms
status: active
created_at: 2026-07-22T12:19:08+09:00
author: a@qmu.jp
---

# Periodically benchmark agent VM / sandbox execution platforms

## Direction

qmu builds AI agents that must execute untrusted, AI-generated code and run
long-lived agent workloads in isolated compute. The backend that provides that
isolation — a Firecracker microVM, a gVisor/Kata container, or a raw sandbox
primitive — is the single infrastructure choice that sets an agent's cold-start
latency, running cost, isolation guarantee, and capability envelope. This layer
is in active churn and consolidating on a months-long rhythm (AWS entered with
Lambda microVMs in 2026-06; E2B, Modal, Daytona, Fly Machines, Cloudflare,
Vercel, and Northflank compete on the same axes with very different pricing and
isolation models).

The direction is **recurring, cost-bounded public benchmarking of agent VM /
microVM / sandbox execution platforms**, so the team's sandbox-backend decision
stays current as offerings and prices move. Each survey measures the axes that
actually drive the decision — **cold-start latency (p50/p95), warm-reuse time,
and fixed-task wall-clock cost** — against a keyless reference catalog of each
provider's stated isolation model and published pricing, and accumulates
per-provider history so movement is visible over time. Real measurement is
credential- and spend-gated (a per-run `--estimate` inside an agreed ceiling);
providers unreachable in a given trial are recorded honestly as unmeasured
rather than blocking the survey. Results publish as a dated survey series in
English and Japanese alongside the other foundational-research topics.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->
