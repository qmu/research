/** Structurally compatible with the fixed-tier calculator's MemoryReading. */
export type PeakRss =
  | { value: number; unit: "MiB" }
  | {
      value: null;
      unit: "MiB";
      reason: "NOT-RUN" | "NO-FIELD" | "MEASURE-FAILED";
    };

export type ProcessRow = {
  pid: number;
  ppid: number;
  pgid: number;
  rssKiB: number;
  state: string;
  started: string;
};

/** ps on both macOS and Linux reports RSS in KiB. No command text is requested. */
export function parseProcessSnapshot(output: string): ProcessRow[] | null {
  const rows: ProcessRow[] = [];
  const pids = new Set<number>();
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match =
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s*$/.exec(
        line,
      );
    if (!match) return null;
    const [pid, ppid, pgid, rssKiB] = match.slice(1, 5).map(Number);
    if (
      ![pid, ppid, pgid, rssKiB].every(Number.isSafeInteger) ||
      pid <= 0 ||
      pids.has(pid)
    )
      return null;
    pids.add(pid);
    rows.push({ pid, ppid, pgid, rssKiB, state: match[5], started: match[6] });
  }
  return rows;
}

/** Keep identities only while present, so a disappeared PID is never retained. */
export function createProcessTreeSampler(rootPid: number) {
  let previous = new Map<number, string>();
  let peakKiB = 0;
  let sampleCount = 0;

  function sample(rows: ProcessRow[]): {
    members: ProcessRow[];
    valid: boolean;
  } {
    const selected = new Set<number>();
    for (const row of rows) {
      if (row.pgid === rootPid || previous.get(row.pid) === row.started)
        selected.add(row.pid);
    }
    // Iterate to closure: ps output need not list parents before children.
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (selected.has(row.ppid) && !selected.has(row.pid)) {
          selected.add(row.pid);
          changed = true;
        }
      }
    }
    const members = rows.filter(
      (row) => selected.has(row.pid) && !row.state.startsWith("Z"),
    );
    previous = new Map(members.map((row) => [row.pid, row.started]));
    const total = members.reduce((sum, row) => sum + row.rssKiB, 0);
    if (!Number.isSafeInteger(total)) return { members, valid: false };
    if (members.length > 0) {
      sampleCount++;
      peakKiB = Math.max(peakKiB, total);
    }
    return { members, valid: true };
  }

  function reading(): PeakRss {
    return sampleCount > 0
      ? { value: peakKiB / 1024, unit: "MiB" }
      : { value: null, unit: "MiB", reason: "NO-FIELD" };
  }
  return {
    sample,
    reading,
    get sampleCount() {
      return sampleCount;
    },
  };
}
