// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StoreRating } from '../ui/StoreRating';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it('links a five-star prompt to the Edge Add-ons listing', () => {
  const { container } = render(<StoreRating />);
  const link = screen.getByRole('link', { name: 'Rate on Microsoft Edge' });
  expect(link.getAttribute('href')).toBe('https://microsoftedge.microsoft.com/addons/detail/hcpeajnonkeacefeiihmolopfmjhhpof');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.querySelectorAll('svg')).toHaveLength(5);
  expect(container.querySelector('svg path')).toBeTruthy();
});

it('hides the Edge rating prompt in Firefox', () => {
  vi.stubEnv('FIREFOX', 'true');
  render(<StoreRating />);
  expect(screen.queryByRole('link', { name: 'Rate on Microsoft Edge' })).toBeNull();
});
