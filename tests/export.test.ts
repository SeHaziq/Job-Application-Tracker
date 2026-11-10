import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { Repository, TrackerDatabase } from '../lib/repository';
import { backupText, csvText, parseBackup, spreadsheetRows } from '../lib/export';

const sample = {
  id: 'be49cd5b-cbee-4507-892f-3a3141f26254', platform: 'jobstreet' as const, jobTitle: '=1+1',
  companyName: '＋SUM(1,2)', jobDescription: 'First line\nSecond "line"', status: 'applied' as const,
  verificationStatus: 'unconfirmed' as const, externalJobId: '500', jobUrl: 'https://my.jobstreet.com/job/500',
  appliedAt: '2026-11-10T10:30:00.000Z', createdAt: '2026-11-10T10:30:00.000Z', updatedAt: '2026-11-10T10:30:00.000Z',
};

it('escapes multiline CSV data and neutralizes common formula prefixes', () => {
  const csv = csvText([{ ...sample, companyName: ` ${sample.companyName}` }]);
  expect(csv).toContain(`"’=1+1"`);
  expect(csv).toContain(`"’ ＋SUM(1,2)"`);
  expect(csv).toContain(`"First line\nSecond ""line"""`);
});

it('keeps long spreadsheet text in ordered chunks below the Excel cell limit', () => {
  const description = 'a'.repeat(31_999) + '😀' + 'b'.repeat(34_000);
  const { applications, longText } = spreadsheetRows([{ ...sample, jobDescription: description }]);
  expect(applications[1]).toContain('=1+1');
  expect(longText.slice(1).map(row => row[3]).join('')).toBe(description);
  for (const row of [...applications, ...longText]) expect(Math.max(...row.map(cell => cell.length))).toBeLessThanOrEqual(32767);
  expect(longText[1]?.[3]?.endsWith('\uD83D')).toBe(false);
});

it('restores a versioned backup and skips duplicate IDs and vacancy identities', async () => {
  const db = new TrackerDatabase('restore-test');
  const repository = new Repository(db);
  try {
    const backup = backupText([sample], new Date(sample.createdAt));
    expect(parseBackup(backup)).toEqual([sample]);
    expect(await repository.importRecords(backup)).toEqual({ added: 1, skipped: 0 });
    const matching = { ...sample, id: '8d2e752a-0db2-4ea6-8c8b-4801e14a00b6', companyName: 'Changed' };
    expect(await repository.importRecords(backupText([sample, matching]))).toEqual({ added: 0, skipped: 2 });
    expect(await repository.exportPage()).toEqual([sample]);
  } finally {
    await db.delete();
  }
});

it('rejects an invalid row before writing any of a mixed backup', async () => {
  const db = new TrackerDatabase('invalid-restore-test');
  const repository = new Repository(db);
  try {
    const backup = JSON.parse(backupText([sample]));
    backup.records.push({ ...sample, jobUrl: 'javascript:alert(1)' });
    await expect(repository.importRecords(JSON.stringify(backup))).rejects.toThrow('records.1.jobUrl');
    expect(await repository.exportPage()).toEqual([]);
    await expect(repository.importRecords('{"version":42}')).rejects.toThrow();
  } finally {
    await db.delete();
  }
});

it('refuses to generate a JSON backup larger than the restore limit', () => {
  const description = 'x'.repeat(1_000_000);
  const records = Array.from({ length: 26 }, () => ({ ...sample, jobDescription: description }));
  expect(() => backupText(records)).toThrow('24 MiB');
});
