import { field, type SiteDetector } from './types';

function externalId(url: URL) {
  return url.pathname.match(/\/(?:job|job-details|vacancy)\/([\w-]+)(?:\/|$)/i)?.[1]
    ?? url.searchParams.get('jobId') ?? url.searchParams.get('vacancyId')
    ?? url.hash.match(/^#\/(?:job|job-details|vacancy)\/([\w-]+)(?:[/?]|$)/i)?.[1];
}

export const myfuturejobs: SiteDetector = {
  id: 'myfuturejobs',
  isListing: url => Boolean(externalId(url)),
  observes: url => url.hostname === 'candidates.myfuturejobs.gov.my' || Boolean(externalId(url)),
  externalId,
  flow: {
    start: /^apply$/i,
    final: /^(?:apply|submit application)$/i,
    success: /^thank you for your application[.!]?$/i,
    feedback: 'main h1, main h2, [role="dialog"] h1, [role="dialog"] p, [aria-modal="true"] h1, [aria-modal="true"] p, dialog h1, dialog p',
    inApplication: (button, url) => {
      if (url.pathname === '/search-jobs/description' && url.searchParams.get('jobId') && url.searchParams.get('apply') === 'true' &&
        button.closest('swipe-button[data-test="swipe-applyModal-button--accept"]')) return true;
      const scope = button.closest('dialog, [role="dialog"]') ?? button.closest('form');
      const heading = scope?.querySelector('h1, h2, h3, legend')?.textContent?.trim();
      return /^apply for\s+\S/i.test(heading ?? '');
    },
  },
  read: doc => {
    const jobDescription = field(doc, '.vacancy-description .description-container .description, [itemprop="description"], main .job-description');
    const details = [...doc.querySelectorAll('.vacancy-info-02 .content-detail')];
    const detail = (label: string) => details.find(node => field(node, 'h4') === label)?.querySelector('.description')?.textContent?.trim();
    return {
      jobTitle: field(doc, '.vacancy-info-02-title-main-text, main [itemprop="title"], main .job-title')
        ?? (jobDescription ? field(doc, 'main h1') : undefined),
      companyName: field(doc, '.vacancy-info-02-title-company, [itemprop="hiringOrganization"], main .company-name'),
      jobLocation: field(doc, '.vacancy-info-02-title-location, [itemprop="jobLocation"], main .job-location'),
      jobDescription,
      employmentType: detail('Contract'),
      salary: detail('Salary'),
    };
  },
};
