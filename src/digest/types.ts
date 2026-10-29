// Plan morning-digest § 1. The contract between the run log reader (#1) and its users (#2–#5).
// The reader itself lives in `src/digest/read.ts`, exporting `readNight: ReadNight`:
//
//   import { readNight } from './digest/read.js';
//
// Missing data is `null` here; only views turn it into `—` (docs/styleguide.md).

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of `runs/<night>.jsonl`, once it parsed. `at` is kept as written in the log, offset
// included; never converted to UTC.
export type LogLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error: string | null;
};

// One row per job of the night.
export type DigestRow = {
  job: string;
  // Owner on the job's newest line. `null` stays `null`: the row is kept.
  owner: string | null;
  // The job's log lines.
  runs: number;
  // The job's lines with status `retry`.
  retries: number;
  // Status of the job's newest line.
  lastStatus: RunStatus;
  // The newest `error` for the job, even when a later run was `ok`. `null` if it never had one.
  lastError: string | null;
  // `at` of the job's first and newest lines, as written in the log (offset kept).
  firstAt: string;
  lastAt: string;
};

// The night's parsed lines by status. A bad line is none of the three.
export type StatusCounts = Record<RunStatus, number>;

export type Night = {
  // `YYYY-MM-DD`, as asked for.
  night: string;
  // Sorted by `job`, ascending, plain string order. The page and the JSON keep this order.
  // Empty when nothing ran (an empty file, or one with only bad lines): "nothing ran".
  rows: DigestRow[];
  // Non-empty lines that didn't parse or aren't a valid log line. Counted, never thrown.
  // Empty lines (e.g. the trailing newline) are not bad lines.
  badLines: number;
  counts: StatusCounts;
};

// Reads `<runsDir>/<night>.jsonl`. "Newest" means later in the file (the log is append-only).
// Returns `null` when the night has no file, or `night` isn't `YYYY-MM-DD`: a 404, not "nothing
// ran". Never throws on the file's content.
export type ReadNight = (runsDir: string, night: string) => Night | null;
