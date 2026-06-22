# entrypoints

Thin CLI runners — one per research topic, named `run-<topic>.ts`. An entrypoint
parses arguments, calls the topic's pure logic in its `domain/` module, reaches
external sources only through `../vendors/`, and writes the result page to
`docs/research-reports/<slug>.md`.

Keep entrypoints thin: no business logic here, so more of the project stays
verifiable by the type checker and unit tests.
