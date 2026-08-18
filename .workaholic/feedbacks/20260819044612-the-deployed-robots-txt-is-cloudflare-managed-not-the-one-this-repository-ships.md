---
type: Feedback
title: The deployed robots.txt is Cloudflare-managed, not the one this repository ships
kind: concern
source: development
subject: person:a@qmu.jp
created_at: 2026-08-19T04:46:12+09:00
author: a@qmu.jp
supersedes: 
---

# The deployed robots.txt is Cloudflare-managed, not the one this repository ships

The deployed site serves a `/robots.txt` that is NOT the one this repository ships. Cloudflare injects its zone-level Managed robots.txt ahead of the origin file, so the response carries a `User-agent: *` group with `Allow: /` (plus per-AI-crawler `Disallow`) *before* the site own `User-agent: * / Disallow: /`. Under the robots.txt merge rules, two groups matching the same user-agent are merged and an equal-specificity `Allow: /` beats `Disallow: /`, so the blanket disallow this repository configured is not the rule a compliant crawler applies.

Verified live on 2026-08-19 against `https://staging-research.qmu.co.jp/robots.txt`.

The staging site is still not indexable: every page carries `<meta name="robots" content="noindex, nofollow">` (verified on `/` and `/research-reports/`) and no sitemap is served (`/sitemap.xml` -> 404). That meta tag is the load-bearing signal, and it only works if the crawler is allowed to fetch the page — so the injected `Allow: /` does not weaken the posture, it is what lets the noindex be read at all. The defect is that the repository states one posture in `docs/.vitepress/config.ts` (`buildEnd`, driven by `DOCS_PUBLIC_HOSTNAME`) and the zone serves another, so a future change to either side is invisible to the other.

## How to Fix

Decide which layer owns the crawl posture and make the other match: either drop the repo-side blanket `Disallow: /` and document that `noindex` is the mechanism, or turn off Cloudflare Managed robots.txt for the `qmu.co.jp` zone. If a genuinely uncrawlable staging surface is wanted instead, put it behind Cloudflare Access rather than robots rules.
