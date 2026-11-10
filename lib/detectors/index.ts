import { platformOf } from '../platforms';
import type { CapturedJob } from '../records';
import { webUrl } from '../urls';
import { jobstreet } from './jobstreet';
import { linkedin } from './linkedin';
import { myfuturejobs } from './myfuturejobs';
import { maukerja, isMaukerjaSearch } from './maukerja';
import { readPosting } from './structured';

export const detectors = { linkedin, jobstreet, myfuturejobs, maukerja };

export function extractJob(doc: Document | DocumentFragment, href: string): CapturedJob | null {
  const url = new URL(href);
  const platform = platformOf(href);
  // A search page can expose posting metadata for a different vacancy behind the modal.
  const structured = platform === 'maukerja' && isMaukerjaSearch(url) ? null : readPosting(doc, href);
  if (platform === 'generic') return structured ? { ...structured, platform, jobUrl: webUrl(href) } : null;

  const detector = detectors[platform];
  const listing = detector.isListing(url);
  if (!listing && !structured) return null;
  const dom = listing ? detector.read(doc, url) : {};
  const known = Object.fromEntries(Object.entries(structured ?? {}).filter(([, value]) => value !== undefined));
  const fields = { ...dom, ...known };
  if (!fields.jobTitle && !fields.companyName && !fields.jobDescription) return null;
  return {
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
    platform, jobUrl: webUrl(href),
    externalJobId: detector.externalId(url) ?? structured?.externalJobId,
  };
}
