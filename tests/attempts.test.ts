import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Repository, TrackerDatabase } from '../lib/repository';

const job = { platform: 'linkedin' as const, jobTitle: 'Engineer', jobUrl: 'https://www.linkedin.com/jobs/view/72/', externalJobId: '72' };
const context = 'session:12';
const now = Date.UTC(2026, 10, 10, 12);
let db: TrackerDatabase;
let repo: Repository;
beforeEach(() => {
  db = new TrackerDatabase('attempt-tests');
  repo = new Repository(db);
});
afterEach(() => db.delete());

it('captures a started job without saving an application', async () => {
  const started = await repo.start(context, job, now);
  expect(started.stage).toBe('started');
  expect(await repo.exportPage()).toEqual([]);
  expect((await repo.current(context, 'linkedin', now))?.id).toBe(started.id);
});

it('uses a JobStreet listing draft in the review tab after the listing tab closes', async () => {
  const vacancy = { ...job, platform: 'jobstreet' as const, jobUrl: 'https://my.jobstreet.com/job/72' };
  await repo.start('session:12:jobstreet', vacancy, now);
  await repo.forgetStarted('session:12:');
  expect(await repo.submitJobstreetReview('another:16:jobstreet', 'another:', '72', 10, now + 1)).toBeNull();
  expect(await repo.submitJobstreetReview('session:16:jobstreet', 'session:', '99', 10, now + 1)).toBeNull();
  const [first, second] = await Promise.all([
    repo.submitJobstreetReview('session:16:jobstreet', 'session:', '72', 10, now + 1),
    repo.submitJobstreetReview('session:16:jobstreet', 'session:', '72', 10, now + 2),
  ]);
  expect(first).toMatchObject({ job: vacancy, context: 'session:16:jobstreet', stage: 'pending' });
  expect(second).toEqual(first);
  expect(await repo.pending()).toHaveLength(1);
  expect(await repo.exportPage()).toEqual([]);
});

it('recovers JobStreet from explicit success even without a review event or current-session draft', async () => {
  const vacancy = { ...job, platform: 'jobstreet' as const, jobUrl: 'https://my.jobstreet.com/job/72' };
  await repo.start('old-session:12:jobstreet', vacancy, now);
  const result = await repo.confirmJobstreetSuccess('72', vacancy.jobUrl, 'Northwind', now + 1000);
  expect(result).toMatchObject({ outcome: 'site_confirmed', needsTitle: false });
  expect(await repo.exportPage()).toMatchObject([{ ...vacancy, companyName: 'Northwind', verificationStatus: 'site_confirmed' }]);
  expect(await repo.confirmJobstreetSuccess('72', vacancy.jobUrl, 'Northwind', now + 2000)).toBeNull();
  expect(await repo.exportPage()).toHaveLength(1);
});

it('saves confirmed JobStreet success without job details and enriches it without duplicating the record', async () => {
  const url = 'https://my.jobstreet.com/job/72';
  const original = await repo.confirmJobstreetSuccess('72', url, 'Northwind', now);
  expect(original).toMatchObject({ outcome: 'site_confirmed', needsTitle: true });
  const enriched = await repo.confirmJobstreetSuccess('72', url, 'Northwind', now + 2000, { jobTitle: 'Engineer', jobDescription: 'Public ad details' });
  expect(enriched).toMatchObject({ recordId: original?.recordId, needsTitle: false });
  expect(await repo.exportPage()).toMatchObject([{ id: original?.recordId, jobTitle: 'Engineer', jobDescription: 'Public ad details',
    appliedAt: new Date(now).toISOString(), verificationStatus: 'site_confirmed' }]);
});

it('persists the original deadline across repeated submit events and worker reopen', async () => {
  const started = await repo.start(context, job, now);
  const first = await repo.submit(context, started.id, 10, now);
  db.close();
  db = new TrackerDatabase('attempt-tests');
  repo = new Repository(db);
  const second = await repo.submit(context, started.id, 30, now + 2000);
  expect(first?.deadline).toBe(now + 10000);
  expect(second?.deadline).toBe(first?.deadline);
  expect(await repo.exportPage()).toEqual([]);
});

it('lets decline win before the deadline and makes repeated resolution harmless', async () => {
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 5, now);
  await repo.resolve(started.id, 'decline', now + 1000, context);
  await repo.resolve(started.id, 'expire', now + 5000, context);
  expect(await repo.exportPage()).toEqual([]);
});

it('auto-saves as unconfirmed even when expiration and confirmation race after the deadline', async () => {
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 5, now);
  await Promise.all([
    repo.resolve(started.id, 'accept', now + 5100, context),
    repo.resolve(started.id, 'expire', now + 5100, context),
  ]);
  expect(await repo.exportPage()).toMatchObject([{ verificationStatus: 'unconfirmed', appliedAt: new Date(now).toISOString() }]);
});

it('only promotes a saved job when a submitted attempt is confirmed', async () => {
  const { record } = await repo.add(job, 'saved');
  const started = await repo.start(context, job, now);
  expect(await repo.resolve(started.id, 'site', now, context)).toBeNull();
  await repo.submit(context, started.id, null, now + 1);
  await repo.resolve(started.id, 'expire', now + 100000, context);
  expect((await repo.exportPage())[0]?.status).toBe('saved');
  await repo.resolve(started.id, 'site', now + 2000, context);
  expect(await repo.exportPage()).toMatchObject([{ id: record.id, status: 'applied', verificationStatus: 'site_confirmed' }]);
});

it('blocks a different tab from resolving an attempt and discards explicit failure', async () => {
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 10, now);
  expect(await repo.resolve(started.id, 'site', now + 100, 'session:other')).toBeNull();
  await repo.resolve(started.id, 'fail', now + 200, context);
  expect(await repo.pending()).toEqual([]);
  expect(await repo.exportPage()).toEqual([]);
});

it('returns the timeout result on a duplicate request and accepts a fresh late site signal', async () => {
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 5, now);
  await repo.expire(now + 5000);
  expect(await repo.resolve(started.id, 'expire', now + 5100, context)).toMatchObject({ outcome: 'unconfirmed' });
  await repo.resolve(started.id, 'site', now + 5500, context);
  expect(await repo.exportPage()).toMatchObject([{ verificationStatus: 'site_confirmed' }]);
});

it('clears records and attempts together', async () => {
  await repo.add(job, 'saved');
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 10, now);
  await repo.clear();
  await repo.expire(now + 20000);
  expect(await repo.exportPage()).toEqual([]);
  expect(await repo.pending()).toEqual([]);
});

it('undoes a timeout-owned application after explicit failure and restores a prior saved job', async () => {
  const { record } = await repo.add(job, 'saved');
  const started = await repo.start(context, { ...job, jobDescription: 'Captured description' }, now);
  await repo.submit(context, started.id, 5, now);
  await repo.expire(now + 5000);
  await repo.resolve(started.id, 'fail', now + 6000, context);
  expect(await repo.exportPage()).toMatchObject([{
    id: record.id, status: 'saved', verificationStatus: null, appliedAt: null, jobDescription: 'Captured description',
  }]);
});

it('does not undo an auto-save after the user changes it', async () => {
  const started = await repo.start(context, job, now);
  await repo.submit(context, started.id, 5, now);
  await repo.expire(now + 5000);
  const [record] = await repo.exportPage();
  if (!record) throw new Error('Expected auto-saved record');
  await repo.update(record.id, { ...record, notes: 'I checked this' });
  await repo.resolve(started.id, 'fail', now + 6000, context);
  expect(await repo.exportPage()).toMatchObject([{ id: record.id, notes: 'I checked this' }]);
});
