# Strata measured fixture

`strata-memory-summary.json` is an unmodified copy of the published
[memory-summary.json](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/bench/results/2026-09-30-community-rtx-5090/memory-summary.json)
from Niko1221/Strata at commit `7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`,
produced by that run's `monitor.py` sampling the host once per second from
before model load through the end of the recall checks (see that directory's
[README.md](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/bench/results/2026-09-30-community-rtx-5090/README.md)).

- `ram_peak_GiB` is `MemTotal - MemAvailable` at its highest sample: the whole
  machine's resident memory, including Strata, other services and
  non-reclaimable system memory. It is explicitly **not** process RSS.
- `gpu_peak_MiB` is the highest system-wide VRAM reading on the selected GPU
  over the same samples.
- `samples` / `sample_duration_s` / `sampling_method` describe the sampler
  run that produced the two peaks; they are not themselves memory readings.
- `swap_start_MiB` / `swap_peak_MiB` / `swap_end_MiB` are retained in the
  fixture for provenance but are not read by `normalizeStrataMemory`; swap
  pressure is a different signal from resident memory and is out of scope
  here.

This replays a published measurement, not a new research-dev or Apple
Silicon run.
