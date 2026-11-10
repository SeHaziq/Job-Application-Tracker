import { z } from 'zod';
import { platformNames } from './platforms';
import { recordSchema, statusNames, verificationNames, type JobRecord } from './records';

// A string backup is encoded again by Chrome runtime messaging.
export const backupLimit = 24 * 1024 * 1024;
const format = 'job-application-tracker';
const backupSchema = z.object({
  format: z.literal(format), version: z.literal(1), exportedAt: z.iso.datetime(), records: z.array(recordSchema),
});

export function backupText(records: JobRecord[], date = new Date()) {
  const text = JSON.stringify({ format, version: 1, exportedAt: date.toISOString(), records }, null, 2);
  if (new TextEncoder().encode(text).length > backupLimit) throw new Error('This log exceeds the 24 MiB JSON backup and restore limit.');
  return text;
}

export function parseBackup(text: unknown) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > backupLimit) {
    throw new Error('Choose a tracker backup no larger than 24 MiB.');
  }
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { throw new Error('This file is not valid JSON.'); }
  const backup = backupSchema.safeParse(value);
  if (!backup.success) {
    const issue = backup.error.issues[0];
    const path = issue?.path.join('.');
    throw new Error(path ? `Invalid backup at ${path}. ${issue?.message ?? ''}` : 'This is not a supported tracker backup.');
  }
  return backup.data.records;
}

const columns = [
  'Record ID', 'Company', 'Job title', 'Platform', 'Status', 'Verification', 'Applied (UTC)',
  'Job location', 'Company location', 'Employment type', 'Work arrangement', 'Salary', 'Original job URL', 'Platform job ID',
  'Job description', 'Qualifications', 'Requirements', 'Experience', 'Resume version', 'Notes', 'Created (UTC)', 'Updated (UTC)',
];

function row(record: JobRecord) {
  return [
    record.id, record.companyName, record.jobTitle, platformNames[record.platform], statusNames[record.status],
    record.verificationStatus ? verificationNames[record.verificationStatus] : '',
    record.appliedAt, record.jobLocation, record.companyLocation, record.employmentType, record.workArrangement,
    record.salary, record.jobUrl, record.externalJobId, record.jobDescription, record.qualifications, record.requirements,
    record.experience, record.resumeVersion, record.notes, record.createdAt, record.updatedAt,
  ].map(value => value ?? '');
}

function csvCell(value: string) {
  // A typographic apostrophe stays ordinary text when spreadsheet editors re-save the CSV.
  const text = /^[\p{Cc}\p{Cf}\s]*[=+\-@＝＋－＠]/u.test(value) || /^[\t\r\n]/.test(value) ? `’${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvText(records: JobRecord[]) {
  return '\uFEFF' + [columns, ...records.map(row)].map(values => values.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function spreadsheetRows(records: JobRecord[]) {
  const longText = [['Record ID', 'Field', 'Part', 'Text']];
  const applications = [columns, ...records.map(record => row(record).map((value, index) => {
    if (value.length <= 32_767) return value;
    let offset = 0;
    let part = 1;
    while (offset < value.length) {
      let end = Math.min(value.length, offset + 32_000);
      if (/[\uDC00-\uDFFF]/.test(value.charAt(end))) end--;
      longText.push([record.id, columns[index] ?? 'Text', String(part++), value.slice(offset, end)]);
      offset = end;
    }
    return 'See Long text sheet for the full value.';
  }))];
  return { applications, longText };
}
