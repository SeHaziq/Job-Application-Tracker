// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/dom';
import { renderPrompt, renderResult } from '../ui/notification';
import type { PendingAttempt } from '../lib/attempts';

const job = { jobTitle: 'Platform Engineer', companyName: 'Northwind', platform: 'linkedin' as const };
const submittedAt = 1_000_000;
const pending: PendingAttempt = { id: 'test', context: 'tab', stage: 'pending', job, createdAt: submittedAt, submittedAt, deadline: submittedAt + 5000 };
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  document.body.replaceChildren();
  vi.useRealTimers();
});

it('shows the recovered time remaining and asks the worker to expire once', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(submittedAt + 3000);
  const decision = vi.fn(async () => {});
  cleanup = renderPrompt(document.body, pending, decision);
  expect(screen.getByText('Auto-save in')).toBeTruthy();
  expect(screen.getByText('2s')).toBeTruthy();
  expect(screen.getByRole<HTMLProgressElement>('progressbar').value).toBe(2000);
  await vi.advanceTimersByTimeAsync(4000);
  expect(decision).toHaveBeenCalledExactlyOnceWith('expire');
});

it('counts down to the confirmed notification closing', async () => {
  vi.useFakeTimers();
  const close = vi.fn();
  cleanup = renderResult(document.body, { outcome: 'site_confirmed' }, close);
  expect(screen.getByText('Closes in')).toBeTruthy();
  expect(screen.getByText('4s')).toBeTruthy();
  await vi.advanceTimersByTimeAsync(2000);
  expect(screen.getByText('2s')).toBeTruthy();
  await vi.advanceTimersByTimeAsync(2000);
  expect(close).toHaveBeenCalledTimes(1);
});

it.each([['Yes, save', 'accept'], ['No', 'decline']])('sends the selected decision for %s', async (label, expected) => {
  const decision = vi.fn(async () => {});
  cleanup = renderPrompt(document.body, { ...pending, deadline: null }, decision);
  expect(screen.queryByRole('progressbar')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: label }));
  expect(decision).toHaveBeenCalledExactlyOnceWith(expected);
});

it('restores the actions after a failed save', async () => {
  const decision = vi.fn(async () => { throw new Error('offline'); });
  cleanup = renderPrompt(document.body, { ...pending, deadline: null }, decision);
  const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Yes, save' });
  fireEvent.click(button);
  await screen.findByText('Could not reach the tracker. Try again.');
  expect(button.disabled).toBe(false);
});
