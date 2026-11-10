// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ApplicationTable } from '../ui/ApplicationTable';
import { applicationInsights } from '../lib/dashboard';
import { JobForm } from '../ui/JobForm';
import type { JobRecord } from '../lib/records';

const first: JobRecord = {
  id: '0cbf03c1-c807-4c1b-a0c0-c5c35ed23364', platform: 'linkedin',
  companyName: 'Northwind', jobTitle: 'Platform Engineer', status: 'interview', verificationStatus: 'user_confirmed',
  appliedAt: '2026-11-02T10:30:00.000Z', createdAt: '2026-11-02T10:30:00.000Z', updatedAt: '2026-11-02T10:30:00.000Z',
};
const second: JobRecord = {
  ...first, id: '1762abfa-f016-4d45-90da-ff4346ecb847', platform: 'jobstreet',
  jobTitle: 'Backend Engineer', companyName: 'Aster', status: 'applied', verificationStatus: 'unconfirmed',
  appliedAt: '2026-11-05T10:30:00.000Z',
};
afterEach(cleanup);

it('counts applications by local Monday and current status while excluding saved jobs', () => {
  const now = new Date(2026, 10, 10, 12);
  const previousSunday = new Date(2026, 10, 8, 23, 59).toISOString();
  const thisMonday = new Date(2026, 10, 9, 0, 0).toISOString();
  const report = applicationInsights([
    { ...first, appliedAt: previousSunday },
    { ...second, appliedAt: thisMonday },
    { ...second, status: 'saved', appliedAt: null },
  ], 4, now);
  expect(report.weeks.map(week => week.count)).toEqual([0, 0, 1, 1]);
  expect(report.weeks.at(-1)?.start).toEqual(new Date(2026, 10, 9));
  expect(Object.fromEntries(report.byStatus)).toEqual({ applied: 1, assessment: 0, interview: 1, offer: 0, rejected: 0, withdrawn: 0 });
});

it('shows the stored salary in its own column and identifies missing salaries', () => {
  render(<ApplicationTable records={[{ ...first, salary: 'RM 4,000 – RM 5,500' }, second]} onOpen={() => {}} />);
  expect(screen.getByRole('columnheader', { name: 'Salary' })).toBeTruthy();
  expect(screen.getByText('RM 4,000 – RM 5,500')).toBeTruthy();
  expect(screen.getByLabelText('Salary unavailable')).toBeTruthy();
});

it('searches and filters records before opening the selected job', () => {
  const open = vi.fn();
  render(<ApplicationTable records={[first, second]} onOpen={open} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'engineer' } });
  fireEvent.change(screen.getByLabelText('Verification'), { target: { value: 'unconfirmed' } });
  expect(screen.queryByText('Platform Engineer')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Backend Engineer' }));
  expect(open).toHaveBeenCalledWith(second);
});

it('sorts by company and flags only plausible similar records', () => {
  const duplicate = { ...first, id: '6d0df8ac-65b8-4a0a-9231-755b083f91f1', externalJobId: '2' };
  render(<ApplicationTable records={[first, second, duplicate]} onOpen={() => {}} />);
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'company' } });
  expect(within(screen.getAllByRole('row')[1]!).getByText('Aster')).toBeTruthy();
  expect(screen.getAllByText('Possible duplicate')).toHaveLength(2);
});

it('requires a meaningful job title and saves a corrected manual capture', async () => {
  const save = vi.fn(async () => {});
  render(<JobForm initial={{ platform: 'linkedin', jobTitle: '   ' }} onSave={save} onCancel={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Enter a job title.');
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Software Engineer' } });
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'applied' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ jobTitle: 'Software Engineer', platform: 'linkedin' }), 'applied', null, null);
});

it('keeps captured details when the popup saves with the extra fields collapsed', async () => {
  const save = vi.fn(async () => {});
  const captured = {
    platform: 'jobstreet' as const, jobTitle: 'Data Analyst', companyName: 'Northwind',
    jobUrl: 'https://my.jobstreet.com/job/58', externalJobId: '58', jobDescription: 'Fixture vacancy details.',
  };
  render(<JobForm compact initial={captured} onSave={save} onCancel={() => {}} />);
  expect(screen.getByText('Listing details and notes').closest('details')?.open).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining(captured), 'saved', null, null);
});
