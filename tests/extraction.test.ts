// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { extractJob } from '../lib/detectors';
import { readPosting } from '../lib/detectors/structured';

function fixture(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

it('extracts structured posting before DOM and keeps full description as text', () => {
  const doc = fixture(`<main><h1>DOM title</h1></main><script type="application/ld+json">{
    "@graph": [{"@type": "JobPosting", "title": "Platform Engineer",
      "hiringOrganization": {"name": "Northwind"}, "description": "<p>Build systems.</p><p>Own delivery.</p><script>alert(1)<\/script>",
      "jobLocation": {"address": {"addressLocality": "Kuala Lumpur", "addressCountry": "MY"}},
      "employmentType": ["FULL_TIME", "CONTRACT"], "jobLocationType": "TELECOMMUTE"}]
  }</script>`.replace('alert(1)</script>', 'alert(1)<\\/script>'));
  expect(extractJob(doc, 'https://www.linkedin.com/jobs/view/42/')).toMatchObject({
    jobTitle: 'Platform Engineer', companyName: 'Northwind', externalJobId: '42',
    jobDescription: 'Build systems.\nOwn delivery.', jobLocation: 'Kuala Lumpur, MY',
    employmentType: 'Full-time, Contract', workArrangement: 'Remote',
  });
});

it('uses the current URL when a page has several structured postings', () => {
  const doc = fixture(`<script type="application/ld+json">[
    {"@type":"JobPosting","title":"Related","url":"/job/12"},
    {"@type":"JobPosting","title":"Current","url":"/job/34"}
  ]</script>`);
  expect(readPosting(doc, 'https://example.com/job/34?source=search')?.jobTitle).toBe('Current');
  expect(readPosting(doc, 'https://example.com/careers')).toBeNull();
});

it.each([
  ['https://www.linkedin.com/jobs/search/?currentJobId=42', '<main><h1 class="job-details-jobs-unified-top-card__job-title">Developer</h1><div class="job-details-jobs-unified-top-card__company-name">Northwind</div><div id="job-details">Details</div></main>', '42'],
  ['https://my.jobstreet.com/job/54', '<main><h1 data-automation="job-detail-title">Developer</h1><span data-automation="advertiser-name">Northwind</span><div data-automation="jobAdDetails">Details</div></main>', '54'],
  ['https://candidates.myfuturejobs.gov.my/job/65', '<main><h1>Developer</h1><span itemprop="hiringOrganization">Northwind</span><div itemprop="description">Details</div></main>', '65'],
])('uses dedicated listing DOM on %s', (url, html, id) => {
  expect(extractJob(fixture(html), url)).toMatchObject({ jobTitle: 'Developer', companyName: 'Northwind', jobDescription: 'Details', externalJobId: id });
});

it('requires job signals on generic pages and ignores unstructured sign-in pages', () => {
  const doc = fixture('<main><h1>Sign in</h1><form><button>Submit</button></form></main>');
  expect(extractJob(doc, 'https://example.org')).toBeNull();
  expect(extractJob(doc, 'https://www.linkedin.com/login')).toBeNull();
});

it('reads the selected LinkedIn details panel without using generated classes', () => {
  const doc = fixture(`<main><aside><a href="/jobs/view/42/">Card label</a>
    <a href="/company/wrong/">Wrong employer</a><a href="/jobs/view/41/">Other job</a></aside>
    <section><div><a href="/company/northwind/"><img alt="Northwind logo">Northwind</a></div>
      <div data-display-contents="true"><p><a href="https://www.linkedin.com/jobs/view/42/?trackingId=fixture">Data Analyst (12 months contract)</a></p></div>
      <div></div><p><span>Malaysia</span> · <span>1 week ago</span> · Over 100 applicants</p>
      <p>Promoted by hirer · Actively reviewing applicants</p><button>Easy Apply</button><button>Save</button>
    </section></main>`);
  expect(extractJob(doc, 'https://www.linkedin.com/jobs/search-results/?currentJobId=42')).toMatchObject({
    externalJobId: '42', jobTitle: 'Data Analyst (12 months contract)', companyName: 'Northwind', jobLocation: 'Malaysia',
  });
  expect(extractJob(doc, 'https://www.linkedin.com/jobs/search-results/?currentJobId=43')).toBeNull();
});

it('reads the live MYFutureJobs vacancy panel on the search detail route', () => {
  const doc = fixture(`<h1>Discover Jobs</h1><div class="vacancy-info-02">
    <h1 class="vacancy-info-02-title-main-text">Data Analyst</h1>
    <h2 class="vacancy-info-02-title-company">Example Employer</h2>
    <h2 class="vacancy-info-02-title-location">Kuala Lumpur</h2>
    <div class="content-detail"><h4>Contract</h4><div class="description">Permanent</div></div>
    <div class="content-detail"><h4>Salary</h4><div class="description">RM 2,600</div></div>
    <div class="vacancy-description"><div class="description-container">
      <span class="description">Analyse job data.</span></div>
      <div class="company-description">Company profile.</div>
    </div></div>`);
  expect(extractJob(doc, 'https://candidates.myfuturejobs.gov.my/search-jobs/description?jobId=abcd&what=Data')).toMatchObject({
    jobTitle: 'Data Analyst', companyName: 'Example Employer', jobLocation: 'Kuala Lumpur',
    jobDescription: 'Analyse job data.', employmentType: 'Permanent', salary: 'RM 2,600', externalJobId: 'abcd',
  });
});

it('uses the selected MauKerja modal rather than the background listing or applicant card', () => {
  const doc = fixture(`<h1>Data Analyst Jobs</h1><script type="application/ld+json">{"@type":"JobPosting","title":"Background job"}</script>
    <div class="modal is-active"><div class="modal-content"><div class="lg:sticky lg:top-6">
      <div><h2>Executive Assistant</h2>\n<a href="/company/northwind">Northwind</a></div>
      <div><div>$ MYR2,500 - MYR3,500 Sebulan</div><div>Sepenuh Masa</div>
        <div>Bandar Kuala Lumpur, WP Kuala Lumpur</div><div>Posted 4 days ago • Closing 1 Dec</div></div>
      <div>Mohon kerja ini sebagai: Applicant profile</div><button type="button">Mohon Segera</button>
    </div></div></div>`);
  const search = 'https://www.maukerja.my/jobsearch/data-analyst-jobs-in-kuala-lumpur';
  expect(extractJob(doc, `${search}?curentJobId=QldTOw3DOV`)).toMatchObject({
    platform: 'maukerja', externalJobId: 'QldTOw3DOV', jobTitle: 'Executive Assistant', companyName: 'Northwind',
    salary: 'MYR2,500 - MYR3,500 Sebulan', employmentType: 'Sepenuh Masa', jobLocation: 'Bandar Kuala Lumpur, WP Kuala Lumpur',
  });
  doc.querySelector('.modal')!.classList.remove('is-active');
  expect(extractJob(doc, `${search}?curentJobId=QldTOw3DOV`)).toBeNull();
});

it('reads the matching MauKerja search card by job ID when the details panel is inline', () => {
  const doc = fixture(`<h1>Search results</h1>
    <mkrb-job-card job-id="46E1xTqQG1" job-title="Executive Assistant" company="Kean How Believe"></mkrb-job-card>
    <mkrb-job-card job-id="QldTOw3DOV" job-title="Executive Assistant" company="Kang Li Sdn Bhd"
      salary="MYR2,500 - MYR3,500 Sebulan" job-types='[{"label":"Sepenuh Masa","href":"/jobsearch/full-time-jobs"}]'
      locations='[{"label":"KL City"},{"label":"WP Kuala Lumpur"}]'></mkrb-job-card>
    <aside><h2>Executive Assistant</h2><p>Kang Li Sdn Bhd</p></aside>`);
  const search = 'https://www.maukerja.my/jobsearch/executive-assistant-jobs';
  expect(extractJob(doc, `${search}?curentJobId=QldTOw3DOV`)).toMatchObject({
    platform: 'maukerja', externalJobId: 'QldTOw3DOV', jobTitle: 'Executive Assistant', companyName: 'Kang Li Sdn Bhd',
    salary: 'MYR2,500 - MYR3,500 Sebulan', employmentType: 'Sepenuh Masa', jobLocation: 'KL City, WP Kuala Lumpur',
  });
  expect(extractJob(doc, `${search}?curentJobId=missing`)).toBeNull();
  expect(extractJob(doc, search)).toBeNull();
  doc.querySelector('[job-id="QldTOw3DOV"]')!.setAttribute('locations', '{invalid');
  expect(extractJob(doc, `${search}?curentJobId=QldTOw3DOV`)).toMatchObject({ companyName: 'Kang Li Sdn Bhd' });
});
