import { field, type SiteDetector } from './types';
import { platformOf } from '../platforms';

function externalId(url: URL) {
  const selected = url.searchParams.get('currentJobId');
  if (selected && /^\d+$/.test(selected)) return selected;
  return url.pathname.match(/^\/jobs\/view\/(?:[^/]+-)?(\d+)(?:\/|$)/)?.[1];
}

export function linkedinConfirmations(root: Document | ShadowRoot): Element[] {
  const headings = [...root.querySelectorAll('[role="dialog"][aria-labelledby="post-apply-modal"] .jpac-modal-header')]
    .filter(node => !node.closest('[hidden], [aria-hidden="true"]') &&
      /^your application was sent to \S.+$/i.test((node.textContent ?? '').trim().replace(/\s+/g, ' ')));
  for (const host of root.querySelectorAll('*')) {
    if (host.shadowRoot && !host.closest('[hidden], [aria-hidden="true"]')) {
      headings.push(...linkedinConfirmations(host.shadowRoot));
    }
  }
  return headings;
}

const jobLinks = 'a[href*="/jobs/view/"]';
const postingDetail = /\b(?:ago|applicants?)\b/i;

function selectedDetails(doc: ParentNode, url: URL) {
  const selected = externalId(url);
  const titles = [...doc.querySelectorAll<HTMLElement>(jobLinks)].filter(link => {
    if (!link.textContent?.trim() || link.closest('[hidden], [aria-hidden="true"]')) return false;
    try {
      const target = new URL(link.getAttribute('href')!, url);
      return platformOf(target.href) === 'linkedin' && externalId(target) === selected;
    } catch { return false; }
  });

  for (const title of titles) {
    let jobLocation: string | undefined;
    let companyName: string | undefined;
    let hasActions = false;
    const afterTitle = (node: Element) => Boolean(title.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    for (let panel = title.parentElement, depth = 0; panel && depth < 7; panel = panel.parentElement, depth++) {
      if (panel.querySelectorAll(jobLinks).length > 1) break;
      if (!jobLocation) {
        for (const row of panel.querySelectorAll('p')) {
          if (!afterTitle(row)) continue;
          const [location, ...details] = (row.innerText || row.textContent || '').split(/[·•]/).map(part => part.trim());
          if (location && details.some(part => postingDetail.test(part))) {
            jobLocation = location;
            break;
          }
        }
      }
      const company = [...panel.querySelectorAll('a[href*="/company/"]')].reverse().find(link => !afterTitle(link));
      const logo = [...panel.querySelectorAll('img[alt]')].reverse().find(image =>
        !afterTitle(image) && /\s+logo$/i.test(image.getAttribute('alt') ?? ''));
      const logoName = logo?.getAttribute('alt')?.replace(/\s+logo$/i, '').trim();
      companyName ??= company?.textContent?.trim() || (logoName !== 'Company' ? logoName : undefined);
      hasActions ||= [...panel.querySelectorAll('button, [role="button"]')].some(button => afterTitle(button) &&
        /^(?:easy apply(?: to .+)?|apply|save)$/i.test((button.getAttribute('aria-label') || button.textContent || '').trim()));
      if (jobLocation && companyName && hasActions) break;
    }
    if (jobLocation && hasActions) return { jobTitle: title.textContent!.trim(), companyName, jobLocation };
  }

  const labels = new Set(titles.map(title => title.textContent!.trim()));
  return { jobTitle: labels.size === 1 ? labels.values().next().value : undefined };
}

export const linkedin: SiteDetector = {
  id: 'linkedin',
  isListing: url => url.pathname.startsWith('/jobs/') && Boolean(externalId(url)),
  observes: url => url.pathname.startsWith('/jobs/'),
  externalId,
  flow: {
    start: /^easy apply(?: to .+)?$/i,
    final: /^submit application$/i,
    success: /^(?:application sent|your application was sent|application submitted)[.!]?$/i,
    feedback: '.artdeco-toast-item__message, .jobs-easy-apply-content h2',
    inApplication: (button, url) => Boolean(button.closest('.jobs-easy-apply-modal, [data-test-modal-id="easy-apply-modal"]') ||
      (externalId(url) && button.closest('dialog[open] footer'))),
  },
  read: (doc, url) => {
    const selected = selectedDetails(doc, url);
    return {
      jobTitle: field(doc, '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.top-card-layout__title') ?? selected.jobTitle,
      companyName: field(doc, '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__org-name-link') ?? selected.companyName,
      jobLocation: field(doc, '.job-details-jobs-unified-top-card__primary-description-container .tvm__text, .topcard__flavor--bullet') ?? selected.jobLocation,
      jobDescription: field(doc, '#job-details, .show-more-less-html__markup'),
    };
  },
};
