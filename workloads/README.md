# workloads

Execution environment and infrastructure configuration.

- `docker/` — container configuration. A pinned, multi-stage, non-root image and
  a Docker Compose file that brings up the full set of local dependencies so a
  research run is reproducible from a clean clone.

Infrastructure-as-code for any hosted environment is added here, organized by
environment.
