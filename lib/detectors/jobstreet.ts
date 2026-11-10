import { field, type SiteDetector } from './types';

function externalId(url: URL) {
  const pathId = url.pathname.match(/^\/job\/(\d+)(?:\/|$)/)?.[1];
  if (pathId) return pathId;
  const selected = url.searchParams.get('jobId');
  if (selected && /^\d+$/.test(selected)) return selected;
}

export function jobstreetApplyId(url: URL) {
  return url.pathname.match(/^\/job\/(\d+)\/apply(?:\/|$)/)?.[1];
}

export function jobstreetReviewId(pathname: string) {
  return pathname.match(/^\/job\/(\d+)\/apply\/review\/?$/)?.[1];
}

export function jobstreetSuccessId(pathname: string) {
  return pathname.match(/^\/job\/(\d+)\/apply\/success\/?$/)?.[1];
}

export function readJobstreetSuccessCompany(doc: Document, url: URL) {
  if (!jobstreetSuccessId(url.pathname)) return;
  const text = doc.body?.innerText ?? doc.body?.textContent ?? '';
  const company = text.match(/^[^\S\r\n]*Your application has been sent to[^\S\r\n]+([^\r\n]+)$/im)?.[1]?.trim();
  return company && company.length <= 500 ? company : undefined;
}

export const jobstreet: SiteDetector = {
  id: 'jobstreet',
  isListing: url => Boolean(externalId(url)),
  observes: url => /^\/(?:job|jobs|apply|application)(?:\/|$)/.test(url.pathname),
  externalId,
  flow: {
    start: /^(?:quick apply|apply|apply now)$/i,
    final: /^(?:submit application|send application)$/i,
    success: /^(?:application submitted|your application has been submitted|application submitted successfully)[.!]?$/i,
    feedback: '[data-automation="application-success"], [data-automation="application-error"], [data-automation="application-confirmation"] h1',
    inApplication: (button, url) => Boolean(
      (jobstreetReviewId(url.pathname) && button.matches('button[type="submit"][data-testid="review-submit-application"]')) ||
      button.closest('[data-automation="job-application-form"], [data-automation="application-review"]') ||
      ((jobstreetApplyId(url) || /^\/apply(?:\/|$)/.test(url.pathname)) && button.closest('main, form, [role="main"]')),
    ),
  },
  read: doc => ({
    jobTitle: field(doc, '[data-automation="job-detail-title"]'),
    companyName: field(doc, '[data-automation="advertiser-name"]'),
    jobLocation: field(doc, '[data-automation="job-detail-location"]'),
    jobDescription: field(doc, '[data-automation="jobAdDetails"], [data-automation="job-detail-description"]'),
    employmentType: field(doc, '[data-automation="job-detail-work-type"]'),
    salary: field(doc, '[data-automation="job-detail-salary"]'),
  }),
};
