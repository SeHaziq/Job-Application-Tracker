import { extractJob } from './detectors';
import { jobstreetApplyId } from './detectors/jobstreet';
import { platformOf } from './platforms';
import type { CapturedJob } from './records';

export function jobstreetListingFromApply(href: string) {
  if (platformOf(href) !== 'jobstreet') return;
  const url = new URL(href);
  const id = jobstreetApplyId(url);
  return id ? { url: new URL(`/job/${id}`, url).href, id } : undefined;
}

export async function captureListing(
  doc: Document,
  href: string,
  readDraft: () => Promise<CapturedJob | null>,
  fetchListing = fetch,
): Promise<CapturedJob | null> {
  const visible = extractJob(doc, href);
  const listing = jobstreetListingFromApply(href);
  if (!listing) return visible;

  const cached = await readDraft().catch(() => null);
  const draft = cached?.platform === 'jobstreet' && cached.externalJobId === listing.id ? cached : null;
  const job: CapturedJob = { ...draft, ...visible, platform: 'jobstreet', jobUrl: listing.url, externalJobId: listing.id };
  if (job.jobTitle && job.companyName && job.jobDescription) return job;

  return { ...job, ...await fetchJobstreetListing(doc, listing.url, fetchListing) };
}

export async function fetchJobstreetListing(doc: Document, url: string, fetchListing = fetch) {
  try {
    const response = await fetchListing(url, {
      mode: 'same-origin', credentials: 'same-origin', redirect: 'error',
      referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length > 4_000_000) return null;
    // The fetched markup stays in a detached template so only its listing fields are read.
    const template = doc.implementation.createHTMLDocument().createElement('template');
    template.innerHTML = html;
    return extractJob(template.content, url);
  } catch {
    return null;
  }
}
