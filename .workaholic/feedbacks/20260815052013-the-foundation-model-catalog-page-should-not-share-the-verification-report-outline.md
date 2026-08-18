---
type: Feedback
title: The foundation model catalog page should not share the verification-report outline
kind: instruction
source: slack
subject: person:claude[bot]
created_at: 2026-08-15T05:20:13+00:00
author: noreply@anthropic.com
supersedes: 
---

# The foundation model catalog page should not share the verification-report outline

# The foundation model catalog page should not share the verification-report outline

Source: https://github.com/qmu/research/issues/109

The `対象モデル` page (`docs/research-reports/foundation-models.md` and its Japanese
`foundation-models.insights.ja.md`) is now rendered in a different format from its own
previous two versions: the dated frames under
`docs/research-reports/history/foundation-models/` carry a compact `カタログ` / `出典`
(Catalog / Sources) structure, while the current page carries the seven-section
verification outline `1. 調査の目的` … `7. 検証データ`. The reporter asks for the
outline to change: this page is not a verification report, so chapters such as
`調査の目的` are unnecessary, and the section structure should deliberately differ from
the verification-style research topics. In their place the page should read as a rough
summary of which providers' models and products it covers and how they are evaluated.
The version-creation operation itself is explicitly left as it is — only the chapter
structure is in question.
