import type { SiteDetector } from './types';
import { linkedinConfirmations } from './linkedin';

export type ButtonSignal = 'start' | 'submit' | 'cancel';
export type Feedback = 'site' | 'fail';

const buttons = 'button, [role="button"], input[type="submit"], a';
const feedback = '[role="status"], [role="alert"], [role="dialog"] h2, [role="dialog"] h3, dialog h2';
const failure = /^(?:your )?application (?:could not be submitted|was not submitted|submission failed)[.!]?$/i;

export function buttonLabel(node: Element) {
  return (node.getAttribute('aria-label') || (node instanceof HTMLInputElement ? node.value : node.textContent) || '')
    .trim().replace(/\s+/g, ' ');
}

export function classifyButton(detector: SiteDetector, target: Element, url: URL): ButtonSignal | null {
  const button = target.closest(buttons);
  if (!button || button.matches(':disabled, [aria-disabled="true"]')) return null;
  const text = buttonLabel(button);
  if (detector.flow.inApplication(button, url, text)) {
    if (/^(?:cancel application|discard application|cancel|discard)$/i.test(text)) return 'cancel';
    if (detector.flow.final.test(text) && !button.closest('form')?.querySelector(':invalid')) return 'submit';
    return null;
  }
  if (detector.isListing(url) && detector.flow.start?.test(text) && detector.flow.inListing?.(button, url) !== false) return 'start';
  return null;
}

export function readSignals(detector: SiteDetector, doc: Document): Map<Element, Feedback> {
  const nodes = doc.querySelectorAll(detector.flow.feedback ? `${feedback}, ${detector.flow.feedback}` : feedback);
  const signals = new Map<Element, Feedback>();
  for (const node of nodes) {
    const text = (node.textContent ?? '').trim().replace(/\s+/g, ' ');
    const decision = failure.test(text) ? 'fail' : detector.flow.success?.test(text) ? 'site' : undefined;
    if (!decision) continue;
    if (node.closest('[hidden], [aria-hidden="true"]') || (node.checkVisibility && !node.checkVisibility({
      checkOpacity: true, checkVisibilityCSS: true,
    }))) continue;
    signals.set(node, decision);
  }
  if (detector.id === 'linkedin') {
    for (const node of linkedinConfirmations(doc)) {
      if (node.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) !== false) signals.set(node, 'site');
    }
  }
  return signals;
}
