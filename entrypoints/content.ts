import { browser } from 'wxt/browser';
import { platformOf, siteMatches } from '../lib/platforms';
import { detectors } from '../lib/detectors';
import { captureListing } from '../lib/manual-capture';
import { request } from '../lib/messages';
import { observeApplications } from '../lib/detectors/observe';
import { createNotifications } from '../ui/notification-manager';
import { readSettings, settingsKey } from '../lib/settings';
import '../ui/notification.css';

export default defineContentScript({
  matches: siteMatches,
  cssInjectionMode: 'ui',
  main(ctx) {
    const probe = (message: { channel?: string }, _sender: unknown, reply: (job: unknown) => void) => {
      if (message?.channel !== 'tracker-probe') return;
      void captureListing(document, location.href, async () => (await request('currentAttempt', undefined))?.job ?? null)
        .then(reply, () => reply(null));
      return true;
    };
    browser.runtime.onMessage.addListener(probe);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(probe));
    const platform = platformOf(location.href);
    if (platform === 'generic') return;
    const markSupported = () => {
      void request('siteAvailable', undefined).catch(() => console.warn('Job Application Tracker could not update its toolbar icon.'));
    };
    markSupported();
    ctx.addEventListener(window, 'pageshow', event => {
      if (event.persisted) markSupported();
    });
    const notifications = createNotifications(ctx);
    let stop: (() => void) | undefined;
    let changed = false;
    const apply = (value: unknown) => {
      if (ctx.isInvalid) return;
      if (readSettings(value).enabled[platform]) {
        stop ??= observeApplications(detectors[platform], notifications);
      } else {
        stop?.();
        stop = undefined;
        notifications.close();
      }
    };
    const update = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local' || !changes[settingsKey]) return;
      changed = true;
      apply(changes[settingsKey].newValue);
    };
    browser.storage.onChanged.addListener(update);
    ctx.onInvalidated(() => { stop?.(); browser.storage.onChanged.removeListener(update); });
    void browser.storage.local.get(settingsKey).then(data => {
      if (!changed) apply(data[settingsKey]);
    }).catch(() => console.warn('Job Application Tracker could not load detection preferences.'));
  },
});
