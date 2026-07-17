---
title: Agent SDK comparison
description: The Agent SDK comparison in LLMs Research. A design comparison of OpenAI Agents SDK, Claude Agent SDK, Cloudflare Agents SDK, and LangGraph based on public documentation — not a measured benchmark.
---

# Agent SDK comparison

The Agent SDK comparison is the research topic that helps engineers implementing LLM applications choose an agent framework / agent runtime. This first edition is a **design comparison** based on public documentation, not a measured benchmark: no live API, paid API, or vendor-hosted agent execution was performed, and no number for performance, cost, reliability, or development speed is published. Cells that were not measured are labelled **not measured** (未測定); cells public information alone cannot settle are labelled **needs verification** (要確認).

This English page and the Japanese canonical article [Agent SDKの比較](../llm-foundation/agent-sdk-comparison) are both hand-authored and maintained together — neither is a machine translation, and no LLM pipeline stage regenerates them.

## 1. Research Purpose

An Agent SDK tends to become an application foundation covering state, tool execution, approvals, long-running work, observability, and deployment targets — not just a model-call wrapper. This survey builds material that lets a team separate the following judgments before adopting an SDK.

- Separate the abstractions the SDK provides from the execution guarantees the hosting platform provides.
- Separate design features verifiable in public documentation from unmeasured operational quality.
- Align comparison axes for narrowing candidates by use case.

This page compares an Agent SDK as "the development unit through which an application handles the agent loop, tool calling, state, control, and observability". Vendor model quality and per-model inference performance are not compared.

## 2. Measurement Targets

### Target Models

The first edition covers the following four SDKs, whose main design elements can be verified in public documentation. Each subject is read twice: as the SDK alone, and as the whole stack it is adopted with.

| Subject | Scope read as the SDK alone | Scope read as whole-stack | Provenance |
| --- | --- | --- | --- |
| OpenAI Agents SDK | The Python SDK design of agents, tools, handoffs, guardrails, sessions, and tracing | Configurations combined with the OpenAI API, Responses API, and sandbox / realtime features; hosting itself is designed on the application side | design comparison |
| Claude Agent SDK | Using Claude Code's agent loop, built-in file/command tools, sessions, hooks, structured output, and OpenTelemetry observability from Python / TypeScript | Configurations including Claude Code's execution model, Claude API authentication, and built-in tools for codebase work | design comparison |
| Cloudflare Agents SDK | Using the Agent class, state, sessions, routing, WebSocket, scheduling, durable execution, and tool integration from a Workers application | Configurations including Cloudflare Workers, the durable runtime, local SQL storage, Workflows, Browser, Sandbox, AI Search, MCP, and more | design comparison |
| LangGraph | The low-level orchestration design of StateGraph, persistence, interrupts, streaming, and subgraphs | Configurations combined with LangChain / LangSmith / LangGraph Platform; standalone use and platform use are read separately | design comparison |

Public documentation referenced:

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [Cloudflare Agents](https://developers.cloudflare.com/agents/)
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)

### Target Metrics

The comparison axes are design axes, not measured metrics: state management, tool calling, long-running execution, retries, human-in-the-loop, structured output, observability, deployment / runtime, vendor lock-in, and local-dev ergonomics. Every cell carries a provenance label instead of a number.

| Category | Content | Provenance |
| --- | --- | --- |
| SDK alone | The design used directly from application code: agent loop, tool definitions, state interface, structured output, approval flows | design comparison |
| Whole-stack | The adopted shape including hosting, persistence, execution resumption, observability infrastructure, and vendor-provided tools on top of the SDK | design comparison |
| Operational quality | Latency, failure rate, retry success rate, cost, development time, maintenance load | not measured |
| Details public information cannot settle | Per-version API differences, limit values, guarantees under specific cloud configurations, failure tolerance in production | needs verification |

## 3. Scope and Constraints

- This page is a design comparison based on public documentation confirmed as of `2026-07-09`.
- No live API, paid API, or vendor-hosted agent execution was performed.
- SDK feature names, offering scope, and recommended APIs change quickly; re-verify primary sources for the version you plan to adopt before introduction.
- Read "long-running execution" and "retries" by separating retry control inside the SDK from recovery guarantees of the hosting platform.
- Read "observability" by separating the SDK's design for emitting traces / metrics / logs from operational dashboards and retention periods.
- "Vendor lock-in" is not a simple lower-is-better score; it is an axis for making explicit which constraints are being accepted.

Each table cell carries one of the following provenance labels.

| Label | Meaning |
| --- | --- |
| design comparison | A design-level comparison verifiable from public documentation or published architecture |
| not measured | Not measured in this survey. Must not be read as a number, ranking, or operational quality |
| needs verification | Cannot be compared confidently from public information alone, or must be confirmed against the version / configuration being adopted |

## 4. Verification Results

This edition publishes **0 measured values**: every cell in the comparison is design-comparison provenance from public documentation, with unmeasured operational quality explicitly labelled not measured and unsettled details labelled needs verification. The full per-axis table is in section 7, Verification Data.

The load-bearing result is the separation of readings: OpenAI Agents SDK reads as an in-application SDK strongly coupled to the OpenAI API family with hosting left to the application; Claude Agent SDK reads as Claude Code's agent loop and built-in tools packaged as a library for codebase work; Cloudflare Agents SDK reads as a stateful runtime inseparable from the Cloudflare Workers platform (durable identity, storage, real-time connections, scheduled and recoverable execution); LangGraph reads as provider-neutral low-level orchestration whose observability and deployment become a stack only with LangSmith / LangGraph Platform.

## 5. Analysis

| Use case | Candidate | How to read it |
| --- | --- | --- |
| Build a lightweight agent loop with tools, handoffs, and tracing quickly, centred on the OpenAI API | OpenAI Agents SDK | design comparison: the SDK owns the agent loop, so the application designs the workflow and persistence boundary. not measured: implementation time, cost, stability |
| Build a development-work agent that reads a codebase, edits it, and runs commands | Claude Agent SDK | design comparison: Claude Code-derived built-in tools and permission control are the core. needs verification: tool permissions and audit requirements allowed in a production application |
| Push state, connections, scheduled work, and recovery onto a hosted runtime on Workers | Cloudflare Agents SDK | design comparison: evaluate the Cloudflare execution platform together with the SDK, not the SDK alone. not measured: real operational cost and latency |
| Manage complex stateful workflows as explicit graphs, leaning provider-neutral | LangGraph | design comparison: low-level orchestration you design yourself. not measured: learning cost, operating cost |

This first edition declares no general-purpose winner. For an adoption decision, first decide how much to delegate to the SDK and where your own application platform takes over. In particular, candidates whose runtime and hosting are tightly coupled (like Cloudflare Agents SDK) and candidates offering low-level orchestration (like LangGraph) must not be ranked naively in the same column.

## 6. Reproduction

### Reproduction Steps

This page is reproduced by reading the public documentation and attaching a provenance label to every cell. No live or paid API is used.

```sh
# Check the public pages. No API key is required.
open https://openai.github.io/openai-agents-python/
open https://code.claude.com/docs/en/agent-sdk/overview
open https://developers.cloudflare.com/agents/
open https://docs.langchain.com/oss/python/langgraph/overview
```

Update procedure:

1. In each candidate's official documentation, check the pages on state, tools, long-running execution, retries, human-in-the-loop, structured output, observability, deployment/runtime, vendor lock-in, and local-dev ergonomics.
2. Separate the SDK's own features from whole-stack features including hosting / runtime / provider.
3. Label unmeasured performance, cost, reliability, and development time **not measured**.
4. Label details that public information alone cannot compare **needs verification**.
5. Only when a live API is executed, keep the execution timestamp, versions, inputs, outputs, cost estimate, and artifacts, and treat it as a separate measured article.

### Reproduction Cost (Estimate)

$0. Reproduction reads public documentation pages only; no API key and no provider billing are involved.

### Cleanup

Nothing to clean up. No external resource, account, or artifact is created by reproducing this page.

## 7. Verification Data

How each subject reads as the SDK alone versus as the whole stack:

| Subject | Reading as the SDK alone | Reading as the whole stack |
| --- | --- | --- |
| OpenAI Agents SDK | design comparison: read as an SDK handling the agent loop, tools, handoffs, guardrails, sessions, and tracing inside a Python application | design comparison: coupling to the OpenAI API family is strong, but application hosting, job management, and external databases are designed separately |
| Claude Agent SDK | design comparison: read as an execution system that packages Claude Code's agent loop and built-in tools as a library | design comparison: read as a development-work stack including codebase editing, shell execution, permissions, and hooks |
| Cloudflare Agents SDK | design comparison: read as the Agent class and stateful runtime API on Workers | design comparison: read as the Cloudflare stack including durable identity, storage, real-time connections, scheduled work, and recoverable execution |
| LangGraph | design comparison: read as low-level orchestration centred on the state graph and checkpoints | design comparison: with LangSmith or LangGraph Platform, read as a stack including observability and deployment; standalone use leaves self-managed operations |

The full comparison by axis:

| Axis | OpenAI Agents SDK | Claude Agent SDK | Cloudflare Agents SDK | LangGraph |
| --- | --- | --- | --- | --- |
| State management | design comparison: sessions carry conversation history with a choice of backend implementations. not measured: load under long retention / large-scale operation | design comparison: sessions and pathways to external storage exist. not measured: operational quality of session storage | design comparison: per-agent state, sessions, and local SQL storage are core runtime features. not measured: performance by data volume | design comparison: persistence / checkpointer / memory are built into graph execution. not measured: performance per backend |
| Tool calling | design comparison: function tools, MCP, and handoffs are SDK abstractions. not measured: latency as tool count grows | design comparison: built-in tools such as Read, Write, Edit, Bash plus MCP are available. needs verification: the tool boundary to allow in a production application | design comparison: easy connection to Cloudflare tools such as MCP, Browser, Sandbox, AI Search. not measured: cost and latency per tool | design comparison: tool execution is composed as graph nodes or LangChain integrations. needs verification: differences per adopted tool framework |
| Long-running execution | design comparison: the agent loop and sessions handle multi-step runs. needs verification: recovery guarantees on the hosting side are configuration-dependent | design comparison: the Claude Code-derived work loop is driven from the SDK. needs verification: hosting design for long jobs | design comparison: scheduling, durable execution, and recoverable execution are runtime features. not measured: actual recovery time | design comparison: durable execution, persistence, and resume are central axes. not measured: actual recovery time |
| Retries | needs verification: confirm at adoption the boundary between the SDK's error handling and the application's retry policy | needs verification: confirm at adoption the responsibility split across SDK, tool execution, and hosting-side retries | design comparison: pathways to retries and queue / workflow integration exist. not measured: retry success rate | design comparison: fault tolerance is a design axis. not measured: retry success rate |
| Human-in-the-loop | design comparison: pathways for human-in-the-loop and run interruption / resume exist. not measured: approval-UI implementation effort | design comparison: control points via approvals / user input / permissions / hooks. not measured: approval-UI implementation effort | design comparison: starters and patterns cover human-in-the-loop approval. not measured: approval-UI implementation effort | design comparison: interrupts let a human inspect and modify state. not measured: approval-UI implementation effort |
| Structured output | design comparison: output schema / Pydantic-style typing pathways exist. not measured: schema-compliance rate | design comparison: an official structured-output pathway exists. not measured: schema-compliance rate | needs verification: separate the SDK runtime's responsibility from the chosen model / harness for structured output. not measured: schema-compliance rate | design comparison: state schemas type the graph's internal state. needs verification: schema guarantees on model output depend on the connected model/tool layer |
| Observability | design comparison: built-in tracing. not measured: fit of trace retention and operational dashboards | design comparison: OpenTelemetry observability and cost / usage tracking pathways. not measured: fit of trace retention and operational dashboards | design comparison: logs, metrics, and traces connect to Cloudflare's operational surface. not measured: retention periods and cost | design comparison: LangSmith integration covers trace / debug / evaluation. not measured: operational load without LangSmith |
| Deployment / runtime | design comparison: the SDK is an in-application runtime; the deploy target is the user's choice. not measured: differences per deploy target | design comparison: the Claude Code runtime is used from Python / TypeScript SDKs. needs verification: hosting constraints and binary distribution terms | design comparison: a strong premise of hosting on Cloudflare Workers. not measured: cold start and regional differences | design comparison: standalone execution and LangGraph Platform use are separable. not measured: differences per deploy target |
| Vendor lock-in | design comparison: coupling to the OpenAI API is strong, though a model-provider swap pathway exists. needs verification: parity across providers | design comparison: coupling to Claude Code features and Anthropic authentication is strong. needs verification: parity when using other providers | design comparison: adopting the Cloudflare runtime couples strongly to the platform. needs verification: porting cost to other platforms | design comparison: the framework alone leans provider-neutral. needs verification: coupling when adopting LangSmith / Platform |
| Local-dev ergonomics | design comparison: easy to start as a Python SDK. not measured: first-implementation time | design comparison: easy to start codebase work with Python / TypeScript SDKs and built-in tools. not measured: first-implementation time | design comparison: starters and a local dev pathway exist. not measured: first-implementation time | design comparison: high freedom in graph design, at the cost of learning the abstractions. not measured: first-implementation time |
