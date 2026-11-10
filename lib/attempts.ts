import type { Job, JobRecord } from './records';

interface BaseAttempt {
  id: string;
  context: string;
  job: Job;
  createdAt: number;
}
export type StartedAttempt = BaseAttempt & { stage: 'started' };
export type PendingAttempt = BaseAttempt & { stage: 'pending'; submittedAt: number; deadline: number | null };
export type PendingSummary = Pick<PendingAttempt, 'id' | 'deadline'> & { job: Pick<Job, 'jobTitle' | 'companyName' | 'platform'> };
export type Attempt = StartedAttempt | PendingAttempt;
export type Decision = 'accept' | 'decline' | 'expire' | 'site' | 'fail';
export type Outcome = 'user_confirmed' | 'site_confirmed' | 'unconfirmed' | 'discarded';
export interface Resolution { outcome: Outcome; recordId?: JobRecord['id'] }
export interface JobstreetSuccess {
  outcome: 'site_confirmed';
  recordId: string;
  needsTitle: boolean;
  newlyConfirmed: boolean;
}
export interface SettledAttempt {
  id: string;
  context: string;
  stage: 'settled';
  settledAt: number;
  submittedAt?: number;
  resolution: Resolution;
  rollback?: { action: 'delete' | 'restore_saved'; updatedAt: string };
}

export const startLifetime = 60 * 60 * 1000;
export const signalLifetime = 2 * 60 * 1000;

export function decide(attempt: Attempt, decision: Decision, now: number): Outcome | null {
  if (decision === 'fail') return 'discarded';
  if (attempt.stage === 'started') return null;
  if (decision === 'site') return now - attempt.submittedAt <= signalLifetime ? 'site_confirmed' : null;
  if (attempt.deadline !== null && now >= attempt.deadline) return 'unconfirmed';
  if (decision === 'accept') return 'user_confirmed';
  if (decision === 'decline') return 'discarded';
  return null;
}
