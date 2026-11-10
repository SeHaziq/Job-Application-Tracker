import type { CapturedJob } from '../records';
import type { SupportedPlatform } from '../platforms';

export interface SiteDetector {
  id: SupportedPlatform;
  isListing(url: URL): boolean;
  observes(url: URL): boolean;
  externalId(url: URL): string | undefined;
  read(doc: ParentNode, url: URL): Omit<CapturedJob, 'platform'>;
  flow: {
    start: RegExp;
    final: RegExp;
    success: RegExp;
    feedback: string;
    inApplication(button: Element, url: URL): boolean;
  };
}

export function field(doc: ParentNode, selector: string) {
  const node = doc.querySelector<HTMLElement>(selector);
  return (node?.innerText || node?.textContent)?.trim() || undefined;
}
