import type { Resolution } from '../attempts';
import { fetchJobstreetListing, jobstreetListingFromApply } from '../manual-capture';
import { request } from '../messages';
import { jobstreetSuccessId, readJobstreetSuccessCompany } from './jobstreet';

export function observeJobstreetSuccess(onSaved: (result: Resolution) => void) {
  let href: string | undefined;
  let stopReading: (() => void) | undefined;

  function checkRoute() {
    if (href === location.href) return;
    stopReading?.();
    const page = href = location.href;
    const url = new URL(page);
    const listing = jobstreetListingFromApply(page);
    if (!jobstreetSuccessId(url.pathname) || !listing) return;

    async function confirm(companyName: string) {
      const result = await request('confirmJobstreetSuccess', { pathname: url.pathname, companyName });
      if (href !== page || location.href !== page || !result) return;
      if (result.newlyConfirmed) onSaved(result);
      if (!result.needsTitle || !listing) return;
      const details = await fetchJobstreetListing(document, listing.url);
      if (href === page && location.href === page && details?.jobTitle) {
        await request('confirmJobstreetSuccess', { pathname: url.pathname, companyName, listing: details });
      }
    }

    function scan() {
      if (href !== page || location.href !== page) return;
      const companyName = readJobstreetSuccessCompany(document, url);
      if (!companyName) return;
      stopReading?.();
      void confirm(companyName).catch(() => console.warn('Job Application Tracker could not save the JobStreet confirmation.'));
    }

    const observer = new MutationObserver(scan);
    const timeout = setTimeout(() => stopReading?.(), 15_000);
    stopReading = () => {
      clearTimeout(timeout);
      observer.disconnect();
      stopReading = undefined;
    };
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scan();
  }

  window.navigation?.addEventListener('currententrychange', checkRoute);
  checkRoute();
  return () => {
    href = undefined;
    window.navigation?.removeEventListener('currententrychange', checkRoute);
    stopReading?.();
  };
}
