import { browser } from 'wxt/browser';
import type { Repository } from './repository';

const name = 'tracker-pending-deadline';

export function startDeadlines(repository: Repository) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();
  const report = () => console.warn('Job Application Tracker could not process a pending deadline.');

  function reconcile() {
    queue = queue.catch(report).then(async () => {
      clearTimeout(timer);
      await repository.expire(Date.now());
      const next = await repository.nextDeadline();
      if (next === null) {
        await browser.alarms.clear(name);
        return;
      }
      const now = Date.now();
      timer = setTimeout(wake, Math.max(0, next - now));
      // Chrome may defer alarms below 30 seconds. The persisted deadline is authoritative.
      await browser.alarms.create(name, { when: Math.max(next, now + 30_000) });
    });
    return queue;
  }

  function wake() {
    void reconcile().catch(report);
  }

  browser.alarms.onAlarm.addListener(alarm => { if (alarm.name === name) wake(); });
  browser.runtime.onStartup.addListener(wake);
  browser.runtime.onInstalled.addListener(wake);
  wake();
  return () => reconcile().catch(report);
}
