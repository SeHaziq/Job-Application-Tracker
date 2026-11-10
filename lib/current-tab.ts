import { browser } from 'wxt/browser';
import { readPosting } from './detectors/structured';
import { platformOf } from './platforms';
import { detectors } from './detectors';
import type { CapturedJob } from './records';
import { webUrl } from './urls';
import { jobstreetListingFromApply } from './manual-capture';

export async function currentTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const jobUrl = webUrl(tab?.url);
  const platform = platformOf(jobUrl);
  const externalJobId = jobUrl && platform !== 'generic' ? detectors[platform].externalId(new URL(jobUrl)) : undefined;
  return { tabId: tab?.id, jobUrl, platform, externalJobId };
}

export async function captureTab(tab: Awaited<ReturnType<typeof currentTab>>): Promise<CapturedJob> {
  const { tabId, jobUrl, platform, externalJobId } = tab;
  const fallback = { platform, jobUrl: jobUrl ? jobstreetListingFromApply(jobUrl)?.url ?? jobUrl : undefined, externalJobId };
  if (tabId === undefined || !jobUrl) return fallback;
  if (platform !== 'generic') {
    try {
      const job: CapturedJob | null = await browser.tabs.sendMessage(tabId, { channel: 'tracker-probe' }, { frameId: 0 });
      if (job) return job;
    } catch {
      // The page may have been open before the extension was installed.
    }
  }
  try {
    const [capture] = await browser.scripting.executeScript({ target: { tabId }, func: readPosting });
    return { ...fallback, ...capture?.result, externalJobId: externalJobId ?? capture?.result?.externalJobId };
  } catch {
    return fallback;
  }
}
