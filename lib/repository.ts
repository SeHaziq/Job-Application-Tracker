import Dexie, { type Table } from 'dexie';
import { decide, signalLifetime, startLifetime, type Attempt, type Decision, type JobstreetSuccess, type PendingAttempt, type Resolution, type SettledAttempt } from './attempts';
import type { Countdown } from './settings';
import type { Platform } from './platforms';
import { parseBackup } from './export';
import { normalizeUrl, webUrl } from './urls';
import {
  type Job, type JobRecord, type JobSummary, type RecordInput, type Status,
  editableRecordSchema, jobSchema, parseInput, recordSchema,
} from './records';

type StoredRecord = JobRecord & { normalizedUrl?: string; platformIdentity?: string };
export interface SaveResult { record: JobRecord; duplicate: boolean }
export interface Overview { total: number; interviews: number; offers: number; unconfirmed: number }

function platformIdentity(job: Pick<Job, 'platform' | 'externalJobId'>) {
  return job.platform !== 'generic' && job.externalJobId ? `${job.platform}:${job.externalJobId}` : undefined;
}

function definedFields(value: object) {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));
}

export class TrackerDatabase extends Dexie {
  records!: Table<StoredRecord, string>;
  attempts!: Table<Attempt | SettledAttempt, string>;

  constructor(name = 'job-application-tracker') {
    super(name);
    this.version(1).stores({ records: 'id, &normalizedUrl, &[platform+externalJobId], status, verificationStatus, appliedAt' });
    this.version(2).stores({ attempts: 'id, context, stage, createdAt, deadline' });
    this.version(3).stores({ attempts: 'id, context, stage, createdAt, deadline, settledAt' });
    this.version(4).stores({ records: 'id, &normalizedUrl, &platformIdentity, status, verificationStatus, appliedAt' })
      .upgrade(async transaction => {
        const records = transaction.table<StoredRecord>('records');
        await records.toCollection().modify(record => { delete record.normalizedUrl; });
        const urls = new Set<string>();
        await records.toCollection().modify(record => {
          record.platformIdentity = platformIdentity(record);
          record.jobUrl = webUrl(record.jobUrl);
          const url = normalizeUrl(record.jobUrl);
          if (url && !urls.has(url)) {
            record.normalizedUrl = url;
            urls.add(url);
          }
        });
      });
  }
}

export class Repository {
  constructor(protected db = new TrackerDatabase()) {}

  async summaries(): Promise<JobSummary[]> {
    const records: JobSummary[] = [];
    await this.db.records.each(({ id, platform, jobTitle, companyName, jobLocation, salary, notes, status, verificationStatus, appliedAt, createdAt }) => {
      records.push({ id, platform, jobTitle, companyName, jobLocation, salary, notes: notes?.slice(0, 512), status, verificationStatus, appliedAt, createdAt });
    });
    return records;
  }

  async get(id: string): Promise<JobRecord> {
    const record = await this.db.records.get(id);
    if (!record) throw new Error('This record is no longer available.');
    return recordSchema.parse(record);
  }

  async exportPage(after?: string): Promise<JobRecord[]> {
    const page = after ? this.db.records.where('id').above(after) : this.db.records.orderBy('id');
    const records: JobRecord[] = [];
    let bytes = 0;
    const encoder = new TextEncoder();
    for (const stored of await page.limit(8).toArray()) {
      const record = recordSchema.parse(stored);
      const size = encoder.encode(JSON.stringify(record)).length;
      if (records.length && bytes + size > 16 * 1024 * 1024) break;
      records.push(record);
      bytes += size;
    }
    return records;
  }

  async overview(): Promise<Overview> {
    const [all, saved, interviews, offers, unconfirmed] = await this.db.transaction('r', this.db.records, () => Promise.all([
      this.db.records.count(),
      this.db.records.where('status').equals('saved').count(),
      this.db.records.where('status').equals('interview').count(),
      this.db.records.where('status').equals('offer').count(),
      this.db.records.where('verificationStatus').equals('unconfirmed').count(),
    ]));
    return { total: all - saved, interviews, offers, unconfirmed };
  }

  protected async match(job: Pick<Job, 'platform' | 'externalJobId' | 'jobUrl'>): Promise<StoredRecord | undefined> {
    const identity = platformIdentity(job);
    if (identity) {
      const byId = await this.db.records.where('platformIdentity').equals(identity).first();
      if (byId) return byId;
    }
    const url = normalizeUrl(job.jobUrl);
    if (url) return this.db.records.where('normalizedUrl').equals(url).first();
  }

  async lookup(job: Pick<Job, 'platform' | 'externalJobId' | 'jobUrl'>) {
    const record = await this.match(job);
    return record ? { status: record.status, appliedAt: record.appliedAt, verificationStatus: record.verificationStatus } : null;
  }

  protected async put(record: JobRecord) {
    const normalizedUrl = normalizeUrl(record.jobUrl);
    const job = { ...record, normalizedUrl, platformIdentity: platformIdentity(record) };
    try {
      await this.db.records.put(job);
    } catch (error) {
      if (error instanceof Dexie.ConstraintError) throw new Error('This vacancy already has a record.');
      throw error;
    }
    return record;
  }

  async add(input: unknown, status: 'saved' | 'applied'): Promise<SaveResult> {
    if (status !== 'saved' && status !== 'applied') throw new Error('Choose a valid record status.');
    const job = parseInput(jobSchema, input);
    return this.db.transaction('rw', this.db.records, async () => {
      const now = new Date().toISOString();
      const existing = await this.match(job);
      if (existing) {
        if (status === 'applied' && existing.status === 'saved') {
          const updatedAt = new Date(Math.max(Date.parse(now), Date.parse(existing.updatedAt) + 1)).toISOString();
          const record = recordSchema.parse({
            ...existing, ...definedFields(job), status, verificationStatus: 'user_confirmed', appliedAt: now, updatedAt,
          });
          return { record: await this.put(record), duplicate: false };
        }
        return { record: recordSchema.parse(existing), duplicate: true };
      }
      const record = recordSchema.parse({
        ...job, id: crypto.randomUUID(), status, createdAt: now, updatedAt: now,
        appliedAt: status === 'applied' ? now : null,
        verificationStatus: status === 'applied' ? 'user_confirmed' : null,
      });
      return { record: await this.put(record), duplicate: false };
    });
  }

  async update(id: string, input: unknown, expectedUpdatedAt?: string): Promise<JobRecord> {
    const update: RecordInput = parseInput(editableRecordSchema, input);
    return this.db.transaction('rw', this.db.records, async () => {
      const existing = await this.db.records.get(id);
      if (!existing) throw new Error('This record is no longer available.');
      if (expectedUpdatedAt && expectedUpdatedAt !== existing.updatedAt) throw new Error('This record changed. Close and reopen it to see the latest version.');
      const now = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
      const status: Status = update.status;
      const verification = update.verificationStatus;
      const record = recordSchema.parse({
        ...update, id, createdAt: existing.createdAt, updatedAt: now,
        appliedAt: status === 'saved' ? null : update.appliedAt ?? existing.appliedAt ?? now,
        verificationStatus: status === 'saved' ? null :
          verification === 'site_confirmed' && existing.verificationStatus !== 'site_confirmed' ? 'user_confirmed' :
          verification ?? existing.verificationStatus ?? 'user_confirmed',
      });
      return this.put(record);
    });
  }

  async remove(id: string) {
    await this.db.records.delete(id);
  }

  async clear() {
    await this.db.transaction('rw', this.db.records, this.db.attempts, async () => {
      await this.db.records.clear();
      await this.db.attempts.clear();
    });
  }

  async importRecords(text: unknown) {
    const records = parseBackup(text);
    return this.db.transaction('rw', this.db.records, async () => {
      let added = 0;
      for (const record of records) {
        if (await this.db.records.get(record.id) || await this.match(record)) continue;
        await this.put(record);
        added++;
      }
      return { added, skipped: records.length - added };
    });
  }

  async current(context: string, platform: Platform, now: number, jobId?: string): Promise<Attempt | null> {
    const attempts = (await this.db.attempts.where('context').equals(context).sortBy('createdAt'))
      .filter((attempt): attempt is Attempt => attempt.stage !== 'settled' && attempt.job.platform === platform &&
        (jobId === undefined || attempt.job.externalJobId === jobId) &&
        (attempt.stage === 'pending' || attempt.createdAt > now - startLifetime));
    return attempts.at(-1) ?? null;
  }

  async resumeJobstreet(context: string, sessionPrefix: string, jobId: string, now: number): Promise<Attempt | null> {
    return this.db.transaction('rw', this.db.attempts, async () => {
      const current = await this.current(context, 'jobstreet', now, jobId);
      if (current) return current;
      const drafts = await this.db.attempts.where('context').startsWith(sessionPrefix).filter(attempt =>
        attempt.stage === 'started' && attempt.job.platform === 'jobstreet' &&
        attempt.job.externalJobId === jobId && attempt.createdAt > now - startLifetime,
      ).sortBy('createdAt');
      const draft = drafts.at(-1);
      if (draft?.stage !== 'started') return null;
      const moved = { ...draft, context };
      await this.db.attempts.put(moved);
      return moved;
    });
  }

  async submitJobstreetReview(context: string, sessionPrefix: string, jobId: string, seconds: Countdown, now: number) {
    return this.db.transaction('rw', this.db.attempts, async () => {
      const attempt = await this.resumeJobstreet(context, sessionPrefix, jobId, now);
      return attempt ? this.submit(context, attempt.id, seconds, now) : null;
    });
  }

  async confirmJobstreetSuccess(jobId: string, jobUrl: string, companyName: string, now: number, listing?: Partial<Job>): Promise<JobstreetSuccess | null> {
    const identity = { platform: 'jobstreet', externalJobId: jobId, jobUrl } as const;
    const unknownTitle = 'Job title unavailable';
    return this.db.transaction('rw', this.db.records, this.db.attempts, async () => {
      const existing = await this.match(identity);
      const attempts = (await this.db.attempts.where('stage').anyOf(['started', 'pending']).sortBy('createdAt'))
        .filter((attempt): attempt is Attempt => attempt.stage !== 'settled' &&
          attempt.job.platform === 'jobstreet' && attempt.job.externalJobId === jobId &&
          (attempt.stage === 'pending' || attempt.createdAt > now - startLifetime));
      const attempt = attempts.findLast(candidate => candidate.stage === 'pending') ?? attempts.at(-1);
      const details = { ...attempt?.job, ...definedFields(listing ?? {}) };
      const jobTitle = existing?.jobTitle && existing.jobTitle !== unknownTitle ? existing.jobTitle : details.jobTitle || unknownTitle;
      const newlyConfirmed = existing?.verificationStatus !== 'site_confirmed';
      if (attempts.length) await this.db.attempts.bulkDelete(attempts.map(candidate => candidate.id));
      if (existing && !newlyConfirmed && jobTitle === existing.jobTitle) {
        return jobTitle === unknownTitle ? { outcome: 'site_confirmed', recordId: existing.id, needsTitle: true, newlyConfirmed } : null;
      }

      const timestamp = new Date(now).toISOString();
      const updatedAt = existing ? new Date(Math.max(now, Date.parse(existing.updatedAt) + 1)).toISOString() : timestamp;
      const record = recordSchema.parse({
        ...details, ...definedFields(existing ?? {}), ...identity, jobTitle,
        companyName: existing?.companyName ?? companyName,
        id: existing?.id ?? crypto.randomUUID(),
        status: existing?.status && existing.status !== 'saved' ? existing.status : 'applied',
        appliedAt: existing?.appliedAt ?? (attempt?.stage === 'pending' ? new Date(attempt.submittedAt).toISOString() : timestamp),
        verificationStatus: 'site_confirmed', createdAt: existing?.createdAt ?? timestamp, updatedAt,
      });
      await this.put(record);
      return { outcome: 'site_confirmed', recordId: record.id, needsTitle: record.jobTitle === unknownTitle, newlyConfirmed };
    });
  }

  async start(context: string, input: unknown, now: number): Promise<Attempt> {
    const job = parseInput(jobSchema, input);
    return this.db.transaction('rw', this.db.attempts, async () => {
      const active = await this.current(context, job.platform, now);
      if (active && (job.externalJobId && active.job.externalJobId
        ? job.externalJobId === active.job.externalJobId
        : job.jobUrl && normalizeUrl(job.jobUrl) === normalizeUrl(active.job.jobUrl))) return active;
      if (active?.stage === 'started') await this.db.attempts.delete(active.id);
      await this.db.attempts.where('createdAt').below(now - startLifetime).and(attempt => attempt.stage === 'started').delete();
      const attempt = { id: crypto.randomUUID(), context, job, createdAt: now, stage: 'started' } as const;
      await this.db.attempts.add(attempt);
      return attempt;
    });
  }

  async submit(context: string, id: string, seconds: Countdown, now: number): Promise<PendingAttempt | null> {
    return this.db.transaction('rw', this.db.attempts, async () => {
      const attempt = await this.db.attempts.get(id);
      if (!attempt || attempt.context !== context || attempt.stage === 'settled') return null;
      if (attempt.stage === 'pending') return attempt;
      if (attempt.createdAt <= now - startLifetime) return null;
      const pending: PendingAttempt = {
        ...attempt, stage: 'pending', submittedAt: now, deadline: seconds === null ? null : now + seconds * 1000,
      };
      await this.db.attempts.put(pending);
      return pending;
    });
  }

  async pending(): Promise<PendingAttempt[]> {
    return this.db.attempts.where('stage').equals('pending').toArray() as Promise<PendingAttempt[]>;
  }

  async nextDeadline() {
    const next = await this.db.attempts.orderBy('deadline').first();
    return next?.stage === 'pending' ? next.deadline : null;
  }

  async attemptContext(id: string) {
    return (await this.db.attempts.get(id))?.context;
  }

  async resolve(id: string, decision: Decision, now: number, context?: string): Promise<Resolution | null> {
    return this.db.transaction('rw', this.db.attempts, this.db.records, async () => {
      const attempt = await this.db.attempts.get(id);
      if (!attempt || (context !== undefined && attempt.context !== context)) return null;
      if (attempt.stage === 'settled') return this.replay(attempt, decision, now);
      const outcome = decide(attempt, decision, now);
      if (!outcome) return null;
      const settle = async (resolution: Resolution, rollback?: SettledAttempt['rollback']) => {
        await this.db.attempts.put({
          id, context: attempt.context, stage: 'settled', settledAt: now,
          submittedAt: attempt.stage === 'pending' ? attempt.submittedAt : undefined, resolution, rollback,
        });
        return resolution;
      };
      if (outcome === 'discarded' || attempt.stage !== 'pending') return settle({ outcome: 'discarded' });
      const existing = await this.match(attempt.job);
      if (existing && existing.status !== 'saved' &&
        (existing.verificationStatus === 'site_confirmed' || outcome === 'unconfirmed' ||
          (outcome === 'user_confirmed' && existing.verificationStatus === 'user_confirmed'))) {
        return settle({ outcome: existing.verificationStatus ?? outcome, recordId: existing.id });
      }
      const timestamp = new Date(now).toISOString();
      const updatedAt = existing ? new Date(Math.max(now, Date.parse(existing.updatedAt) + 1)).toISOString() : timestamp;
      const record = recordSchema.parse({
        ...attempt.job, ...definedFields(existing ?? {}), id: existing?.id ?? crypto.randomUUID(),
        status: existing?.status && existing.status !== 'saved' ? existing.status : 'applied',
        appliedAt: existing?.appliedAt ?? new Date(attempt.submittedAt).toISOString(),
        verificationStatus: outcome, createdAt: existing?.createdAt ?? timestamp, updatedAt,
      });
      await this.put(record);
      return settle({ outcome, recordId: record.id }, outcome === 'unconfirmed'
        ? { action: existing ? 'restore_saved' : 'delete', updatedAt } : undefined);
    });
  }

  private async replay(attempt: SettledAttempt, decision: Decision, now: number): Promise<Resolution> {
    const { resolution, submittedAt, rollback } = attempt;
    if ((decision !== 'site' && decision !== 'fail') || resolution.outcome !== 'unconfirmed' || !resolution.recordId ||
      submittedAt === undefined || now - submittedAt > signalLifetime) return resolution;
    const record = await this.db.records.get(resolution.recordId);
    if (record?.verificationStatus !== 'unconfirmed' || record.appliedAt !== new Date(submittedAt).toISOString()) return resolution;
    const updatedAt = new Date(Math.max(now, Date.parse(record.updatedAt) + 1)).toISOString();
    let result: Resolution;
    if (decision === 'site') {
      await this.put(recordSchema.parse({ ...record, verificationStatus: 'site_confirmed', updatedAt }));
      result = { ...resolution, outcome: 'site_confirmed' };
    } else {
      if (!rollback || record.updatedAt !== rollback.updatedAt) return resolution;
      if (rollback.action === 'delete') await this.db.records.delete(record.id);
      else await this.put(recordSchema.parse({ ...record, status: 'saved', appliedAt: null, verificationStatus: null, updatedAt }));
      result = { outcome: 'discarded' };
    }
    await this.db.attempts.put({ ...attempt, resolution: result, settledAt: now, rollback: undefined });
    return result;
  }

  async expire(now: number) {
    const due = await this.db.attempts.where('deadline').belowOrEqual(now).primaryKeys();
    await Promise.all(due.map(id => this.resolve(id, 'expire', now)));
    await this.db.attempts.where('settledAt').below(now - signalLifetime).delete();
    await this.db.attempts.where('createdAt').below(now - startLifetime).and(attempt => attempt.stage === 'started').delete();
  }

  async forgetStarted(contextPrefix: string) {
    // A JobStreet application may still be open after its listing tab closes.
    await this.db.attempts.where('context').startsWith(contextPrefix)
      .and(attempt => attempt.stage === 'started' && attempt.job.platform !== 'jobstreet').delete();
  }
}
