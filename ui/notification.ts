import type { Decision, PendingAttempt, Resolution } from '../lib/attempts';

const feedback = {
  site_confirmed: 'Application confirmed by the website and saved.',
  user_confirmed: 'Application saved.',
  unconfirmed: 'Application saved as unconfirmed.',
  discarded: 'Attempt discarded.',
};

export function resolutionText(result: Resolution | null) {
  return result ? feedback[result.outcome] : 'Attempt closed. Check the dashboard for its result.';
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function card(container: HTMLElement) {
  const node = element('section');
  node.className = 'tracker-card';
  container.replaceChildren(node);
  return node;
}

function mountCountdown(
  node: HTMLElement, label: string, deadline: number, duration: number, onElapsed?: () => void,
) {
  const countdown = element('div');
  countdown.className = 'tracker-countdown';
  const row = element('div');
  row.className = 'tracker-countdown-row';
  const time = element('span');
  row.append(element('span', label), time);
  const progress = element('progress');
  progress.setAttribute('aria-label', `${label} remaining time`);
  progress.max = duration;
  countdown.append(row, progress);
  node.append(countdown);

  function tick() {
    const left = Math.max(0, deadline - Date.now());
    const seconds = Math.ceil(left / 1000);
    const display = `${seconds}s`;
    if (time.textContent !== display) {
      time.textContent = display;
      progress.setAttribute('aria-valuetext', `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    }
    progress.value = left;
    if (left === 0) {
      clearInterval(interval);
      onElapsed?.();
    }
  }

  const interval = setInterval(tick, 125);
  tick();
  return () => clearInterval(interval);
}

export function renderPrompt(
  container: HTMLElement,
  attempt: PendingAttempt,
  onDecision: (decision: Decision) => Promise<void>,
) {
  const node = card(container);
  node.setAttribute('aria-label', 'Job application detected');
  const header = element('div');
  header.className = 'tracker-head';
  const heading = element('strong', 'Job application detected');
  heading.setAttribute('role', 'status');
  const close = element('button', '×');
  close.className = 'tracker-close';
  close.setAttribute('aria-label', 'Dismiss and discard');
  header.append(heading, close);
  const title = element('h2', attempt.job.jobTitle);
  const company = element('p', attempt.job.companyName ?? 'Unknown company');
  const question = element('p', 'Did you successfully submit this application?');
  const actions = element('div');
  actions.className = 'tracker-actions';
  const yes = element('button', 'Yes, save');
  yes.className = 'tracker-primary';
  const no = element('button', 'No');
  actions.append(yes, no);
  const error = element('p');
  error.className = 'tracker-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  node.append(header, title, company, question, actions, error);

  const buttons = [yes, no, close];
  let busy = false;
  let disposed = false;
  async function send(decision: Decision) {
    if (busy || disposed) return;
    busy = true;
    buttons.forEach(button => { button.disabled = true; });
    error.hidden = true;
    try {
      await onDecision(decision);
    } catch {
      if (!disposed) {
        error.textContent = 'Could not reach the tracker. Try again.';
        error.hidden = false;
        buttons.forEach(button => { button.disabled = false; });
        busy = false;
      }
    }
  }

  yes.onclick = () => void send('accept');
  close.onclick = no.onclick = () => void send('decline');
  node.onkeydown = event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      void send('decline');
    }
  };

  const deadline = attempt.deadline;
  const stopCountdown = deadline === null ? undefined
    : mountCountdown(node, 'Auto-save in', deadline, deadline - attempt.submittedAt, () => void send('expire'));

  return () => {
    disposed = true;
    stopCountdown?.();
    node.remove();
  };
}

export function renderResult(container: HTMLElement, result: Resolution | null, onClose: () => void) {
  const node = card(container);
  const message = element('p', resolutionText(result));
  message.setAttribute('role', 'status');
  node.append(message);
  const duration = 4000;
  const stopCountdown = mountCountdown(node, 'Closes in', Date.now() + duration, duration);
  const fade = setTimeout(() => node.classList.add('tracker-leaving'), duration - 160);
  const timer = setTimeout(onClose, duration);
  return () => { stopCountdown(); clearTimeout(fade); clearTimeout(timer); node.remove(); };
}
