import { browser } from 'wxt/browser';
import type { Settings, SettingsPatch } from './settings';
import type { CapturedJob, Job, JobRecord, JobSummary, RecordInput } from './records';
import type { Overview, SaveResult } from './repository';
import type { Attempt, Decision, JobstreetSuccess, PendingAttempt, PendingSummary, Resolution } from './attempts';

export interface Requests {
  siteAvailable: { input: undefined; output: undefined };
  settings: { input: undefined; output: Settings };
  saveSettings: { input: SettingsPatch; output: Settings };
  clearData: { input: 'delete-local-data'; output: Settings };
  overview: { input: undefined; output: Overview };
  list: { input: undefined; output: JobSummary[] };
  getRecord: { input: string; output: JobRecord };
  exportPage: { input: string | undefined; output: JobRecord[] };
  add: { input: { job: Job; status: 'saved' | 'applied' }; output: SaveResult };
  update: { input: { id: string; expectedUpdatedAt: string; record: RecordInput }; output: JobRecord };
  remove: { input: string; output: undefined };
  lookup: { input: CapturedJob; output: Pick<JobRecord, 'status' | 'appliedAt' | 'verificationStatus'> | null };
  currentAttempt: { input: undefined; output: Attempt | null };
  beginAttempt: { input: CapturedJob; output: Attempt | null };
  submitAttempt: { input: string; output: PendingAttempt | null };
  submitJobstreetReview: { input: string; output: PendingAttempt | null };
  confirmJobstreetSuccess: { input: { pathname: string; companyName: string; listing?: CapturedJob }; output: JobstreetSuccess | null };
  decideAttempt: { input: { id: string; decision: Decision }; output: Resolution | null };
  pendingAttempts: { input: undefined; output: PendingSummary[] };
  importRecords: { input: string; output: { added: number; skipped: number } };
}

export type Request = {
  [K in keyof Requests]: { channel: 'tracker'; type: K; input: Requests[K]['input'] }
}[keyof Requests];

export interface AttemptResolved {
  channel: 'tracker-resolved';
  id: string;
  result: Resolution;
}

type Response<T> = { ok: true; value: T } | { ok: false; error: string };

export async function request<K extends keyof Requests>(type: K, input: Requests[K]['input']): Promise<Requests[K]['output']> {
  const response = await browser.runtime.sendMessage({ channel: 'tracker', type, input }) as Response<Requests[K]['output']> | undefined;
  if (!response) throw new Error('The tracker did not respond. Reopen the extension and try again.');
  if (!response.ok) throw new Error(response.error);
  return response.value;
}
