import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };
const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let runsDir: string;

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  copyFileSync('runs/2026-10-28.jsonl', join(runsDir, '2026-10-28.jsonl'));
  writeFileSync(join(runsDir, '2026-10-30.jsonl'), '');
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest page GET /digest/:night', () => {
  it('renders a night with a file', async () => {
    const res = await createApp({ ...config, runsDir }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of JOBS) expect(html).toContain(job);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp({ ...config, runsDir }).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await createApp({ ...config, runsDir }).request('/digest/2026-10-30');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('still renders the jobs of a night with a bad line', async () => {
    const res = await createApp({ ...config, runsDir }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('notes/backup');
    expect(html).toContain('fixtures/refresh');
  });
});

describe('digest JSON GET /api/digest/:night', () => {
  it('returns the night with a file', async () => {
    const res = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-28');
    expect(body.rows.map((row) => row.job)).toEqual(JOBS);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp({ ...config, runsDir }).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('has no rows for an empty night', async () => {
    const res = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
  });

  it('counts the bad line and keeps the good lines', async () => {
    const res = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row) => row.job)).toEqual(JOBS);
  });
});
