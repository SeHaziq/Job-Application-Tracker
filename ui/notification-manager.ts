import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { PendingAttempt, Resolution } from '../lib/attempts';
import { request } from '../lib/messages';
import { renderPrompt, renderResult } from './notification';

export function createNotifications(ctx: ContentScriptContext) {
  const create = () => createShadowRootUi(ctx, {
    name: 'job-application-tracker-notice',
    anchor: 'body',
    position: 'inline',
    mode: 'closed',
    isolateEvents: true,
    onMount: container => container,
  });

  let ui: ReturnType<typeof create> | undefined;
  let cleanup: (() => void) | undefined;
  let revision = 0;

  function close() {
    revision++;
    cleanup?.();
    cleanup = undefined;
    void ui?.then(root => root.remove(), () => {});
  }

  async function show(render: (container: HTMLElement) => () => void) {
    const version = ++revision;
    try {
      ui ??= create();
      const root = await ui;
      if (version !== revision || ctx.isInvalid) return;
      cleanup?.();
      if (!root.shadowHost.isConnected) root.mount();
      if (root.mounted) cleanup = render(root.mounted);
    } catch {
      ui = undefined;
      console.warn('Job Application Tracker could not show the confirmation. Review it in the dashboard.');
    }
  }

  function resolved(result: Resolution | null) {
    void show(container => renderResult(container, result, close));
  }

  ctx.onInvalidated(close);
  return {
    pending(attempt: PendingAttempt) {
      void show(container => renderPrompt(container, attempt, async decision => {
        const result = await request('decideAttempt', { id: attempt.id, decision });
        resolved(result);
      }));
    },
    resolved,
    close,
  };
}
