# Verified local inference file export

This filesystem output boundary reuses the download identity validator. From
`packages/tech`, run:

```sh
node --import tsx/esm src/entrypoints/export-local-inference.ts \
  saved.json export.json expected-run-id \
  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa local-inference/4
```

Supply the run ID, full lowercase target commit SHA, and allowed runner version
from the trusted comparison snapshot, independently of the source file. The CLI
validates those expectations before reading the source, reads once, then verifies
all three against `execution`. It exports the exact validated text, including
formatting, without reopening the source. Identity validation does not establish
measurement quality, authenticity, or complete schema validity.

The destination parent must already exist. A private staging directory in that
parent holds the complete file with mode `0600`; an exclusive hard link publishes
it atomically. An existing destination (including a symlink or the source itself)
is never replaced. Filesystems without hard-link support reject the operation.
This guarantees visibility of a complete file, not durability across power loss.

On rejection, exit status is 1, stdout is empty, and stderr is the fixed code
`EXPORT-SNAPSHOT-REJECTED`, without source data or paths. Identity rejection occurs
before any staging or destination write. Temporary files are removed after both
success and failure. If cleanup fails after publication, the complete destination
may already exist; status is 1 with `EXPORT-CLEANUP-FAILED`. A process kill can
leave a private staging directory requiring manual cleanup.

This is an explicit CLI entrypoint, not an automatic connection to the comparison
page, an HTTP route, or the existing stdout download command. It depends on the
shared validator introduced by qmu/research#247.
