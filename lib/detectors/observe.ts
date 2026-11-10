import { signalLifetime, type Attempt, type PendingAttempt, type Resolution } from '../attempts';
import { browser, type Browser } from 'wxt/browser';
import { request, type AttemptResolved } from '../messages';
import { platformOf } from '../platforms';
import { captureListing, jobstreetListingFromApply } from '../manual-capture';
import { extractJob } from './index';
import { buttonLabel, classifyButton, readSignals, type Feedback } from './flow';
import { jobstreetReviewId, jobstreetSuccessId } from './jobstreet';
import { observeJobstreetSuccess } from './jobstreet-success';
import { maukerjaCardUrl, maukerjaSamePage, maukerjaSendNow } from './maukerja';
import type { SiteDetector } from './types';

interface Notifications {
  pending(attempt: PendingAttempt): void;
  resolved(result: Resolution): void;
}

export function observeApplications(detector: SiteDetector, notifications: Notifications) {
  let active: Attempt | null = null;
  let queue = Promise.resolve();
  let stopWatching: (() => void) | undefined;
  let disposed = false;
  let cardDraft: { page: URL; vacancy: URL } | undefined;

  function enqueue(action: () => Promise<void>) {
    queue = queue.then(async () => {
      if (!disposed) await action();
    }).catch(() => console.warn('Job Application Tracker could not process an application event.'));
  }

  function sameListing(attempt: Attempt, href: string) {
    const url = new URL(href);
    const id = detector.externalId(url);
    return platformOf(href) === detector.id && detector.observes(url) &&
      (!id || !attempt.job.externalJobId || id === attempt.job.externalJobId);
  }

  function watch(attempt: PendingAttempt, baseline: Map<Element, Feedback>, isCurrent = () => sameListing(attempt, location.href)) {
    stopWatching?.();
    const remaining = signalLifetime - (Date.now() - attempt.submittedAt);
    if (remaining <= 0) {
      notifications.pending(attempt);
      return;
    }

    let debounce: ReturnType<typeof setTimeout> | undefined;
    const stale = new Set(baseline.values());
    const reveal = setTimeout(() => notifications.pending(attempt), 650);
    const end = setTimeout(() => stopWatching?.(), remaining);
    const observer = new MutationObserver(() => {
      if (!debounce) debounce = setTimeout(scan, 80);
    });
    // LinkedIn can mount its confirmation inside an open shadow root without a document mutation.
    const shadowScan = detector.id === 'linkedin' ? setInterval(scan, 350) : undefined;
    stopWatching = () => {
      observer.disconnect();
      clearInterval(shadowScan);
      clearTimeout(reveal);
      clearTimeout(end);
      clearTimeout(debounce);
      stopWatching = undefined;
    };

    function scan() {
      debounce = undefined;
      if (!isCurrent()) return;
      const visible = [...readSignals(detector, document).values()];
      for (const signal of stale) if (!visible.includes(signal)) stale.delete(signal);
      const fresh = visible.filter(signal => !stale.has(signal));
      const decision = fresh.includes('fail') ? 'fail' : fresh[0];
      if (!decision) return;
      stopWatching?.();
      enqueue(async () => {
        const result = await request('decideAttempt', { id: attempt.id, decision });
        if (active?.id === attempt.id) active = null;
        if (result) notifications.resolved(result);
      });
    }

    if (shadowScan === undefined) {
      observer.observe(document.body, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: detector.id === 'maukerja' ? ['hidden', 'aria-hidden', 'class', 'style'] : ['hidden', 'aria-hidden'],
      });
    }
    scan();
  }

  function handle(event: Event) {
    if (!event.isTrusted || event.defaultPrevented) return;
    const target = event instanceof SubmitEvent ? event.submitter : event.composedPath()[0];
    if (!(target instanceof Element)) return;
    const page = new URL(location.href);
    const maukerja = detector.id === 'maukerja';
    const card = maukerja ? maukerjaCardUrl(target, page) : undefined;
    const button = maukerja && target.closest('button, input[type="submit"]');
    const text = button ? buttonLabel(button) : '';
    if (!card && detector.flow.start?.test(text)) cardDraft = undefined;
    const draft = maukerjaSendNow.test(text) ? cardDraft : undefined;
    if (draft && !maukerjaSamePage(draft.page, page, draft.vacancy)) return;
    const url = card ?? draft?.vacancy ?? page;
    const href = url.href;
    if (!detector.observes(url)) return;
    const signal = classifyButton(detector, target, url);
    if (!signal) return;
    if (maukerja && signal === 'start') {
      cardDraft = card ? { page, vacancy: card } : undefined;
      stopWatching?.();
    }
    if (signal === 'cancel') {
      enqueue(async () => {
        if (active?.stage !== 'started' || !sameListing(active, href)) return;
        await request('decideAttempt', { id: active.id, decision: 'fail' });
        active = null;
      });
      return;
    }

    const baseline = signal === 'submit' ? readSignals(detector, document) : undefined;
    // Send the review event before the site can unload this document.
    const review = signal === 'submit' && detector.id === 'jobstreet' && jobstreetReviewId(url.pathname)
      ? request('submitJobstreetReview', url.pathname).catch(() => null) : undefined;
    const job = signal === 'start' || !active || !sameListing(active, href) ? extractJob(document, href) : null;
    enqueue(async () => {
      if (signal === 'start') {
        if (job?.jobTitle) active = await request('beginAttempt', job);
        return;
      }
      const reviewed = await review;
      if (reviewed) {
        if (!disposed && (active?.id !== reviewed.id || active.stage !== 'pending')) {
          active = reviewed;
          watch(reviewed, baseline ?? new Map());
        }
        return;
      }
      if (!active || !sameListing(active, href)) {
        const captured = jobstreetListingFromApply(href)
          ? await captureListing(document, href, async () => null) : job;
        if (!captured?.jobTitle || disposed) return;
        active = await request('beginAttempt', captured);
      }
      if (active?.stage === 'pending') {
        if (await request('submitAttempt', active.id)) return;
        active = await request('beginAttempt', active.job);
      }
      if (active?.stage !== 'started') return;
      const pending = await request('submitAttempt', active.id);
      if (pending && !disposed) {
        active = pending;
        if (draft && cardDraft === draft) cardDraft = undefined;
        const source = draft?.page ?? page;
        watch(pending, baseline ?? new Map(), maukerja ? () => maukerjaSamePage(source, new URL(location.href), url) : undefined);
      }
    });
  }

  document.addEventListener('click', handle, true);
  document.addEventListener('submit', handle, true);
  const onResolved = (message: AttemptResolved, sender: Browser.runtime.MessageSender) => {
    if (message?.channel !== 'tracker-resolved' || sender.id !== browser.runtime.id || active?.id !== message.id) return;
    stopWatching?.();
    notifications.resolved(message.result);
  };
  browser.runtime.onMessage.addListener(onResolved);
  const stopSuccess = detector.id === 'jobstreet' ? observeJobstreetSuccess(result => {
    stopWatching?.();
    active = null;
    notifications.resolved(result);
  }) : undefined;
  enqueue(async () => {
    const href = location.href;
    if (detector.id === 'jobstreet' && jobstreetSuccessId(location.pathname)) return;
    const attempt = await request('currentAttempt', undefined);
    if (disposed || location.href !== href) return;
    if (attempt && sameListing(attempt, href)) {
      active = attempt;
      if (attempt.stage === 'pending') watch(attempt, readSignals(detector, document));
      return;
    }
    if (jobstreetListingFromApply(href)) {
      // Capture before a final submit can navigate away from a directly opened application.
      const job = await captureListing(document, href, async () => null);
      if (job?.jobTitle && !disposed && location.href === href) active = await request('beginAttempt', job);
    }
  });

  return () => {
    disposed = true;
    document.removeEventListener('click', handle, true);
    document.removeEventListener('submit', handle, true);
    browser.runtime.onMessage.removeListener(onResolved);
    stopSuccess?.();
    stopWatching?.();
  };
}
