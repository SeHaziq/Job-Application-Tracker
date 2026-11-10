// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { captureListing } from '../lib/manual-capture';

const apply = 'https://my.jobstreet.com/job/123456/apply?sol=application-tracking';
const listing = 'https://my.jobstreet.com/job/123456';
const applicationForm = () => new DOMParser().parseFromString('<main><h1>Apply for this job</h1><form><input></form></main>', 'text/html');
const detail = '<h1 data-automation="job-detail-title">Data Analyst</h1><p data-automation="advertiser-name">Employer</p><div data-automation="jobAdDetails">Analyse job data.</div>';

it('fills JobStreet application pages from the public listing on the same origin', async () => {
  const fetchListing = vi.fn(async () => new Response(detail));
  expect(await captureListing(applicationForm(), apply, async () => null, fetchListing)).toMatchObject({
    jobTitle: 'Data Analyst', companyName: 'Employer', jobDescription: 'Analyse job data.', jobUrl: listing, externalJobId: '123456',
  });
  expect(fetchListing).toHaveBeenCalledExactlyOnceWith(listing, expect.objectContaining({ redirect: 'error', credentials: 'same-origin' }));
});

it('reuses complete captured details for the same vacancy', async () => {
  const fetchListing = vi.fn();
  const cached = {
    platform: 'jobstreet' as const, jobUrl: listing, externalJobId: '123456',
    jobTitle: 'Data Analyst', companyName: 'Employer', jobDescription: 'Analyse job data.',
  };
  expect(await captureListing(applicationForm(), apply, async () => cached, fetchListing)).toMatchObject(cached);
  expect(fetchListing).not.toHaveBeenCalled();
});

it('keeps the public job link when listing access fails without using a different vacancy draft', async () => {
  const fetchListing = vi.fn(async () => new Response('Access denied', { status: 403 }));
  const other = { platform: 'jobstreet' as const, jobTitle: 'Other job', externalJobId: '654321' };
  expect(await captureListing(applicationForm(), apply, async () => other, fetchListing)).toEqual({
    jobUrl: listing, platform: 'jobstreet', externalJobId: '123456',
  });
});

it('does not make a listing request while reading an open JobStreet job ad', async () => {
  const fetchListing = vi.fn();
  const doc = new DOMParser().parseFromString(detail, 'text/html');
  expect(await captureListing(doc, listing, async () => null, fetchListing)).toMatchObject({ jobTitle: 'Data Analyst' });
  expect(fetchListing).not.toHaveBeenCalled();
});
