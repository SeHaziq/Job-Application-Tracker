import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { TrackerDatabase, Repository } from '../lib/repository';
import { normalizeUrl } from '../lib/urls';

let db: TrackerDatabase;
let repo: Repository;
const job = {
  platform: 'linkedin' as const, jobTitle: ' Engineer ', companyName: 'Northwind',
  jobUrl: 'https://www.linkedin.com/jobs/view/42/?utm_source=email', externalJobId: '42',
};
beforeEach(() => {
  db = new TrackerDatabase('tracker-test');
  repo = new Repository(db);
});
afterEach(() => db.delete());

it('keeps meaningful query params while removing campaign parameters', () => {
  expect(normalizeUrl('https://example.com/jobs?id=31&utm_source=email#posting')).toBe('https://example.com/jobs?id=31#posting');
});

it('persists one application across concurrent duplicate saves and database reopen', async () => {
  const [first, second] = await Promise.all([repo.add(job, 'applied'), repo.add(job, 'applied')]);
  expect(first.record.id).toBe(second.record.id);
  db.close();
  db = new TrackerDatabase('tracker-test');
  repo = new Repository(db);
  const records = await repo.exportPage();
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ jobTitle: 'Engineer', verificationStatus: 'user_confirmed', status: 'applied' });
  expect(records[0]?.jobUrl).toBe(job.jobUrl);
});

it('keeps reposts with different identifiers and the same company and title', async () => {
  await repo.add(job, 'applied');
  await repo.add({ ...job, externalJobId: '43', jobUrl: 'https://www.linkedin.com/jobs/view/43/' }, 'applied');
  expect(await repo.exportPage()).toHaveLength(2);
});

it('edits and deletes saved jobs without counting them as applications', async () => {
  const { record } = await repo.add(job, 'saved');
  expect(record.appliedAt).toBeNull();
  expect((await repo.overview()).total).toBe(0);
  const updated = await repo.update(record.id, { ...record, status: 'interview', notes: 'Friday' });
  expect(updated.appliedAt).toEqual(expect.any(String));
  expect((await repo.overview()).interviews).toBe(1);
  await repo.remove(record.id);
  expect(await repo.exportPage()).toEqual([]);
});

it('rejects unsafe URLs and invalid status values', async () => {
  await expect(repo.add({ ...job, jobUrl: 'javascript:alert(1)' }, 'applied')).rejects.toThrow();
  const { record } = await repo.add(job, 'saved');
  await expect(repo.update(record.id, { ...record, status: 'unknown' })).rejects.toThrow();
  expect((await repo.exportPage())[0]?.status).toBe('saved');
});

it('redacts URL credentials while preserving the vacancy and its fragment route', async () => {
  const { record } = await repo.add({
    ...job, jobUrl: 'https://www.linkedin.com/jobs/view/42/?jobId=42&access_token=secret#/posting?authToken=secret&view=full',
  }, 'applied');
  expect(record.jobUrl).toBe('https://www.linkedin.com/jobs/view/42/?jobId=42#/posting?view=full');
});

it('treats structured IDs from unrelated generic sites as separate jobs', async () => {
  await repo.add({ ...job, platform: 'generic', jobUrl: 'https://careers.example.com/job/42' }, 'applied');
  await repo.add({ ...job, platform: 'generic', jobUrl: 'https://careers.example.org/job/42' }, 'applied');
  expect(await repo.exportPage()).toHaveLength(2);
});

it('preserves corrections when a user records an application for a saved vacancy', async () => {
  const { record } = await repo.add({ ...job, jobDescription: 'Original description' }, 'saved');
  const result = await repo.add({ ...job, jobTitle: 'Senior Engineer', notes: 'Updated CV' }, 'applied');
  expect(result.record).toMatchObject({
    id: record.id, status: 'applied', jobTitle: 'Senior Engineer', notes: 'Updated CV', jobDescription: 'Original description',
  });
});

it('keeps descriptions out of log summaries and retrieves them in record detail and export pages', async () => {
  const { record } = await repo.add({ ...job, salary: 'RM 5,000 per month', jobDescription: 'Full description' }, 'applied');
  const summaries = await repo.summaries();
  expect(summaries[0]?.salary).toBe('RM 5,000 per month');
  expect(summaries[0]).not.toHaveProperty('jobDescription');
  expect(await repo.get(record.id)).toMatchObject({ jobDescription: 'Full description' });
  expect(await repo.exportPage()).toMatchObject([{ id: record.id, jobDescription: 'Full description' }]);
  expect(await repo.exportPage(record.id)).toEqual([]);
});

it('migrates legacy URL indexes without dropping records that match after redaction', async () => {
  const name = 'tracker-legacy';
  const legacy = new Dexie(name);
  legacy.version(3).stores({
    records: 'id, &normalizedUrl, &[platform+externalJobId], status, verificationStatus, appliedAt',
    attempts: 'id, context, stage, createdAt, deadline, settledAt',
  });
  const timestamp = new Date().toISOString();
  for (const token of ['one', 'two']) {
    const jobUrl = `https://careers.example.com/jobs/42?access_token=${token}`;
    await legacy.table('records').add({
      id: crypto.randomUUID(), platform: 'generic', jobTitle: 'Developer', jobUrl, normalizedUrl: jobUrl,
      status: 'saved', verificationStatus: null, appliedAt: null, createdAt: timestamp, updatedAt: timestamp,
    });
  }
  legacy.close();
  const migrated = new TrackerDatabase(name);
  try {
    const records = await new Repository(migrated).exportPage();
    expect(records.map(record => record.jobUrl)).toEqual([
      'https://careers.example.com/jobs/42', 'https://careers.example.com/jobs/42',
    ]);
  } finally {
    await migrated.delete();
  }
});
