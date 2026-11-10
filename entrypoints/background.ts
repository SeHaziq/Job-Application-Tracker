import { browser, type Browser } from 'wxt/browser';
import { readSettings, settingsKey, updateSettings } from '../lib/settings';
import type { AttemptResolved, Request } from '../lib/messages';
import { Repository } from '../lib/repository';
import { platformOf } from '../lib/platforms';
import { startDeadlines } from '../lib/deadlines';
import { webUrl } from '../lib/urls';
import { jobstreetApplyId, jobstreetReviewId, jobstreetSuccessId } from '../lib/detectors/jobstreet';

const decisions = ['accept', 'decline', 'expire', 'site', 'fail'] as const;
const siteRequests = ['siteAvailable', 'currentAttempt', 'beginAttempt', 'submitAttempt', 'submitJobstreetReview', 'confirmJobstreetSuccess', 'decideAttempt', 'settings'];
const orderedWrites = ['saveSettings', 'clearData', 'beginAttempt', 'submitAttempt', 'submitJobstreetReview', 'confirmJobstreetSuccess'];

export default defineBackground(() => {
  const repository = new Repository();
  const reconcile = startDeadlines(repository);
  let session: Promise<string> | undefined;
  let writes = Promise.resolve();

  function sessionId() {
    session ??= (async () => {
      const key = 'tracker-session';
      const existing = (await browser.storage.session.get(key))[key];
      if (typeof existing === 'string') return existing;
      const id = crypto.randomUUID();
      await browser.storage.session.set({ [key]: id });
      return id;
    })().catch(error => { session = undefined; throw error; });
    return session;
  }

  async function settings() {
    return readSettings((await browser.storage.local.get(settingsKey))[settingsKey]);
  }

  async function handle(message: Request, sender: Browser.runtime.MessageSender) {
    const extensionPage = sender.url?.startsWith(browser.runtime.getURL(''));
    const platform = platformOf(sender.url);
    if (!extensionPage && (platform === 'generic' || sender.tab?.id === undefined ||
      sender.frameId !== 0 || !siteRequests.includes(message.type))) {
      throw new Error('This page cannot access the tracker.');
    }
    if (message.type === 'siteAvailable') {
      const tabId = sender.tab?.id;
      if (extensionPage || tabId === undefined) return;
      await browser.action.setIcon({ tabId, path: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } });
      await browser.action.setTitle({ tabId, title: 'Job Application Tracker · Supported site' });
      return;
    }
    const now = Date.now();
    const sessionPrefix = !extensionPage ? `${await sessionId()}:` : undefined;
    const context = sessionPrefix ? `${sessionPrefix}${sender.tab?.id}:${platform}` : undefined;
    switch (message.type) {
      case 'settings':
        return settings();
      case 'overview':
        await repository.expire(now);
        return repository.overview();
      case 'list':
        await repository.expire(now);
        return repository.summaries();
      case 'getRecord':
        return repository.get(message.input);
      case 'exportPage':
        await repository.expire(now);
        return repository.exportPage(message.input);
      case 'lookup':
        return repository.lookup(message.input);
      case 'add':
        return repository.add(message.input.job, message.input.status);
      case 'update':
        return repository.update(message.input.id, message.input.record, message.input.expectedUpdatedAt);
      case 'remove':
        await repository.remove(message.input);
        return undefined;
      case 'saveSettings': {
        const next = updateSettings(await settings(), message.input);
        await browser.storage.local.set({ [settingsKey]: next });
        return next;
      }
      case 'clearData': {
        if (message.input !== 'delete-local-data') throw new Error('Confirm deletion in settings.');
        const next = updateSettings(await settings(), { enabled: { linkedin: false, jobstreet: false, myfuturejobs: false, maukerja: false } });
        await browser.storage.local.set({ [settingsKey]: next });
        await repository.clear();
        await reconcile();
        return next;
      }
      case 'currentAttempt': {
        if (!context || platform === 'generic' || !(await settings()).enabled[platform]) return null;
        const jobId = platform === 'jobstreet' && sender.url ? jobstreetApplyId(new URL(sender.url)) : undefined;
        if (jobId && sessionPrefix) return repository.resumeJobstreet(context, sessionPrefix, jobId, now);
        return repository.current(context, platform, now);
      }
      case 'beginAttempt': {
        if (!context || platform === 'generic' || !(await settings()).enabled[platform]) return null;
        const captured = webUrl(message.input.jobUrl);
        const job = { ...message.input, platform, jobUrl: platformOf(captured) === platform ? captured : webUrl(sender.url) };
        const previous = await repository.lookup(job);
        if (previous?.verificationStatus === 'site_confirmed' || previous?.verificationStatus === 'user_confirmed') return null;
        return repository.start(context, job, now);
      }
      case 'submitAttempt': {
        const preferences = await settings();
        if (!context || platform === 'generic' || !preferences.enabled[platform]) return null;
        const pending = await repository.submit(context, message.input, preferences.autoSaveSeconds, now);
        if (pending) await reconcile();
        return pending;
      }
      case 'submitJobstreetReview': {
        if (!context || !sessionPrefix || platform !== 'jobstreet' || typeof message.input !== 'string') return null;
        // Sender.url can describe the original document after a same-document navigation.
        const jobId = jobstreetReviewId(message.input);
        const preferences = await settings();
        if (!jobId || !preferences.enabled.jobstreet) return null;
        const pending = await repository.submitJobstreetReview(context, sessionPrefix, jobId, preferences.autoSaveSeconds, now);
        if (pending) await reconcile();
        return pending;
      }
      case 'confirmJobstreetSuccess': {
        if (!context || platform !== 'jobstreet' || !sender.url || !(await settings()).enabled.jobstreet) return null;
        const jobId = typeof message.input?.pathname === 'string' ? jobstreetSuccessId(message.input.pathname) : undefined;
        const companyName = typeof message.input?.companyName === 'string' ? message.input.companyName.trim() : '';
        if (!jobId || !companyName || companyName.length > 500) return null;
        const listingUrl = new URL(`/job/${jobId}`, sender.url).href;
        const listing = message.input.listing;
        const details = listing?.platform === 'jobstreet' && listing.externalJobId === jobId && webUrl(listing.jobUrl) === listingUrl
          ? listing : undefined;
        const result = await repository.confirmJobstreetSuccess(jobId, listingUrl, companyName, now, details);
        await reconcile();
        return result;
      }
      case 'decideAttempt': {
        const { id, decision } = message.input;
        if (typeof id !== 'string' || !decisions.includes(decision) ||
          (extensionPage && (decision === 'site' || decision === 'fail'))) throw new Error('Invalid attempt decision.');
        const origin = extensionPage ? await repository.attemptContext(id) : undefined;
        const result = await repository.resolve(id, decision, now, context);
        if (result) {
          await reconcile();
          if (origin) {
            const [session, tab] = origin.split(':');
            if (session === await sessionId() && tab) {
              const notice: AttemptResolved = { channel: 'tracker-resolved', id, result };
              void browser.tabs.sendMessage(Number(tab), notice, { frameId: 0 }).catch(() => {});
            }
          }
        }
        return result;
      }
      case 'pendingAttempts':
        await repository.expire(now);
        return (await repository.pending()).map(({ id, deadline, job: { platform, jobTitle, companyName } }) => ({
          id, deadline, job: { platform, jobTitle, companyName },
        }));
      case 'importRecords':
        return repository.importRecords(message.input);
      default:
        throw new Error('Unknown tracker request.');
    }
  }

  browser.runtime.onMessage.addListener((message: Request, sender, reply) => {
    if (message?.channel !== 'tracker' || sender.id !== browser.runtime.id) return;
    const ordered = orderedWrites.includes(message.type) ||
      (message.type === 'currentAttempt' && platformOf(sender.url) === 'jobstreet');
    const response = ordered ? writes.then(() => handle(message, sender)) : handle(message, sender);
    if (ordered) writes = response.then(() => {}, () => {});
    response.then(
      value => reply({ ok: true, value }),
      error => reply({ ok: false, error: error instanceof Error ? error.message : 'Could not complete the tracker request.' }),
    );
    return true;
  });
  browser.tabs.onRemoved.addListener(tabId => {
    void sessionId().then(id => repository.forgetStarted(`${id}:${tabId}:`))
      .catch(() => console.warn('Job Application Tracker could not clear a closed tab’s draft.'));
  });
});
