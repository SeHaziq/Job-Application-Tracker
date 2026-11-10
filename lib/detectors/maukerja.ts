import { field, type SiteDetector } from './types';

const modal = '.modal.is-active .modal-content';
const jobCard = '[class~="lg:sticky"][class~="lg:top-6"]';
export const maukerjaSendNow = /^(?:hantar sekarang|submit now)$/i;
const employment = /^(?:sepenuh masa|separuh masa|kontrak|sambilan|latihan industri|full[- ]time|part[- ]time|contract|internship|temporary|freelance)$/i;
const salary = /^(?:MYR|RM|SGD|USD)\s*\d/i;

export function isMaukerjaSearch(url: URL) {
  return /^\/(?:en\/)?jobsearch\//.test(url.pathname);
}

function externalId(url: URL) {
  if (isMaukerjaSearch(url)) return url.searchParams.get('curentJobId')?.match(/^[a-z\d]+$/i)?.[0];
  const route = /^\/(?:en\/)?job(?:\/([a-z\d]+)(?:-[^/]+)?)?\/?$/i.exec(url.pathname);
  return route?.[1] ?? (route && url.searchParams.get('jobId')?.match(/^[a-z\d]+$/i)?.[0]) ?? undefined;
}

function lines(node?: Element) {
  const text = (node as HTMLElement | undefined)?.innerText || node?.textContent || '';
  return text.split(/\n+/).map(line => line.trim()).filter(Boolean);
}

function resultCard(target: Element) {
  const root = target.getRootNode();
  return target.closest('mkrb-job-card') ?? (root instanceof ShadowRoot && root.host.matches('mkrb-job-card') ? root.host : null);
}

export function maukerjaCardUrl(target: Element, page: URL) {
  const id = isMaukerjaSearch(page) ? resultCard(target)?.getAttribute('job-id')?.match(/^[a-z\d]+$/i)?.[0] : undefined;
  if (!id) return;
  const selected = new URL(page);
  selected.searchParams.set('curentJobId', id);
  return selected;
}

export function maukerjaSamePage(origin: URL, current: URL, vacancy: URL) {
  if (origin.origin !== current.origin || origin.pathname !== current.pathname) return false;
  const currentId = externalId(current);
  return !currentId || currentId === externalId(origin) || currentId === externalId(vacancy);
}

function inListing(button: Element, url: URL) {
  if (!button.matches('button')) return false;
  const card = resultCard(button);
  if (card) return isMaukerjaSearch(url) && card.getAttribute('job-id') === externalId(url) &&
    card.getAttribute('apply') === 'apply' && button.matches('.apply:not(.is-progress)');
  return Boolean(button.closest(modal)?.querySelector(jobCard) || (!isMaukerjaSearch(url) && button.closest(jobCard)));
}

function cardLabels(card: Element, name: string) {
  const value = card.getAttribute(name);
  if (!value) return;
  try {
    const items: unknown = JSON.parse(value);
    if (!Array.isArray(items)) return;
    const labels = items.flatMap(item => typeof item?.label === 'string' ? [item.label.trim()] : []);
    return [...new Set(labels.filter(Boolean))].join(', ') || undefined;
  } catch {
    return undefined;
  }
}

export const maukerja: SiteDetector = {
  id: 'maukerja',
  isListing: url => Boolean(externalId(url)),
  observes: url => Boolean(externalId(url)),
  externalId,
  flow: {
    start: /^(?:mohon|apply job|apply now)$/i,
    inListing,
    final: /^(?:mohon segera|hantar sekarang|submit now)$/i,
    success: /^(?:permohonan berjaya dihantar|application submitted successfully)!?$/i,
    feedback: 'p, span, div:not(:has(div))',
    inApplication: (button, url, label) => Boolean(externalId(url)) && button.matches('button, input[type="submit"]') &&
      (maukerjaSendNow.test(label)
        ? Boolean(button.closest('.modal.is-active, dialog[open], [role="dialog"]') && !button.closest('[hidden], [aria-hidden="true"]'))
        : /^mohon segera$/i.test(label) && inListing(button, url)),
  },
  read(doc, url) {
    const id = isMaukerjaSearch(url) ? externalId(url) : undefined;
    if (id) {
      const result = doc.querySelector(`mkrb-job-card[job-id="${id}"]`);
      const jobTitle = result?.getAttribute('job-title')?.trim();
      if (result && jobTitle) return {
        jobTitle,
        companyName: result.getAttribute('company')?.trim() || undefined,
        salary: result.getAttribute('salary')?.trim() || undefined,
        employmentType: cardLabels(result, 'job-types'),
        jobLocation: cardLabels(result, 'locations'),
      };
    }
    const card = doc.querySelector(`${modal} ${jobCard}`) ?? (isMaukerjaSearch(url) ? null : doc.querySelector(jobCard));
    if (!card) return {};

    // The first two sections contain listing details. The application profile appears below them.
    const [header, details] = card.children;
    if (!header || !details) return {};
    const [title, company] = lines(header);
    const facts = [...details.children].flatMap(lines);
    return {
      jobTitle: field(header, 'h1, h2, h3, [itemprop="title"]') ?? title,
      companyName: field(header, 'a[href*="/company/"], [itemprop="hiringOrganization"]') ?? company,
      salary: facts.map(text => text.replace(/^\$\s*/, '')).find(text => salary.test(text)),
      employmentType: facts.find(text => employment.test(text)),
      jobLocation: facts.find(text => !employment.test(text) && !salary.test(text.replace(/^\$\s*/, '')) &&
        !/^(?:posted\b|closing\b|lihat gaji\b|view salary\b|undisclosed\b|mohon\b|jadilah pemohon\b|kurang dari\b|lebih dari\b)/i.test(text)),
    };
  },
};
