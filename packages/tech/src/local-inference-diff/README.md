# Saved local inference JSON diff

From `packages/tech`:

```sh
npm run --silent local-inference:diff -- before.json after.json > diff.json
```

Reads two saved schemaVersion 1 `runs` documents (the contract proposed in
qmu/research#183). No inference, network access, or input writes occur.
Exit 0 means a valid comparison, including differences; exit 1 means invalid
arguments, unreadable files, invalid JSON/schema, or ambiguous duplicate
engine/model identities. Errors omit paths and parser details.

Output schemaVersion 1 has conditions, environment, and runs. Object keys and
engine/model rows use deterministic lexical order, without timestamps or paths.
Runs match by engine/model, with added/removed rows retained. Arrays within
quality evidence preserve the recorded order. Unknown metric names are ignored.

Speed includes ttft, tps, startup_time, completion_tokens; memory includes
peak_rss. Each field retains before/after evidence and changed, plus delta
(after minus before). Delta is null with MISSING-OR-INCOMPARABLE when missing,
failed, unit/source mismatched, or when input hash, sampling, procedure,
model condition, runtime version, host fingerprint, or execution metadata differs.
Two absent optional fingerprints mean unknown but equal metadata, not proof of
identical hardware. There is no percentage change, ranking, or quality score
invented from these observations.

Quality retains the optional per-fixture judgments proposed in qmu/research#189;
missing quality is null. Environment reports optional host `fingerprint`
(qmu/research#197), `execution` (commandSha256/runnerVersion, qmu/research#198),
and per-run runtimeVersion, condition, status. Source generatedAt is ignored.
All evidence selected for output is operator-supplied: keep source files free
of secrets before sharing a diff. This utility does not collect host information.
