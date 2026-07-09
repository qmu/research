# scripts

Repository-wide scripts, named with a leading verb (`publish-research.sh`,
`generate-*.sh`). The `Makefile` is the entry point that invokes them; CI invokes
the same `Makefile` targets.

`publish-research.sh copy --all` reads its publication set from
`packages/tech/src/research/domain/site.ts` through `npm run research:site --
copy-plan`, so the qmu-co-jp copy order matches the VitePress sidebar and index
order.
