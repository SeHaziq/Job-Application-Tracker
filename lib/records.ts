import { z } from 'zod';
import { supportedPlatforms } from './platforms';
import { webUrl } from './urls';

export const statuses = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'withdrawn'] as const;
export const verifications = ['site_confirmed', 'user_confirmed', 'unconfirmed'] as const;
export type Status = typeof statuses[number];
export type Verification = typeof verifications[number];
export const statusNames: Record<Status, string> = {
  saved: 'Saved job', applied: 'Applied', assessment: 'Assessment', interview: 'Interview',
  offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn',
};
export const verificationNames: Record<Verification, string> = {
  site_confirmed: 'Site confirmed', user_confirmed: 'User confirmed', unconfirmed: 'Unconfirmed',
};

const label = z.string().trim().max(500);
const optionalLabel = label.transform(value => value || undefined).optional();
const description = z.string().trim().max(1_000_000).transform(value => value || undefined).optional();
const instant = z.iso.datetime();

export const jobSchema = z.object({
  platform: z.enum([...supportedPlatforms, 'generic']),
  jobTitle: label.min(1, 'Enter a job title.'),
  companyName: optionalLabel,
  companyLocation: optionalLabel,
  jobLocation: optionalLabel,
  employmentType: optionalLabel,
  workArrangement: optionalLabel,
  salary: optionalLabel,
  qualifications: description,
  requirements: description,
  experience: optionalLabel,
  jobDescription: description,
  jobUrl: z.string().trim().max(8192).refine(url => !url || Boolean(webUrl(url)), 'Enter an HTTP or HTTPS job URL.')
    .transform(webUrl).optional(),
  externalJobId: optionalLabel,
  notes: z.string().trim().max(100_000).transform(value => value || undefined).optional(),
  resumeVersion: optionalLabel,
});

export const editableRecordSchema = jobSchema.extend({
  status: z.enum(statuses),
  verificationStatus: z.enum(verifications).nullable(),
  appliedAt: instant.nullable(),
});

export const recordSchema = editableRecordSchema.extend({
  id: z.uuid(),
  createdAt: instant,
  updatedAt: instant,
}).refine(record => record.status === 'saved'
  ? record.appliedAt === null && record.verificationStatus === null
  : record.appliedAt !== null && record.verificationStatus !== null, 'Application date and verification must agree with its status.');

export type Job = z.infer<typeof jobSchema>;
export type CapturedJob = Partial<Job> & Pick<Job, 'platform'>;
export type RecordInput = z.infer<typeof editableRecordSchema>;
export type JobRecord = z.infer<typeof recordSchema>;
export type JobSummary = Pick<JobRecord, 'id' | 'platform' | 'jobTitle' | 'companyName' | 'jobLocation' |
  'salary' | 'notes' | 'status' | 'verificationStatus' | 'appliedAt' | 'createdAt'>;

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Invalid tracker data.');
  return result.data;
}
