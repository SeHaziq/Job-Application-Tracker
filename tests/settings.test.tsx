// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsPanel } from '../ui/SettingsPanel';
import { readSettings, updateSettings } from '../lib/settings';
import { request } from '../lib/messages';

vi.mock('../lib/messages', () => ({ request: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('merges partial preference updates and preserves unrelated toggles', () => {
  const current = readSettings({ enabled: { linkedin: false }, autoSaveSeconds: 15 });
  expect(updateSettings(current, { enabled: { jobstreet: false } })).toEqual({
    autoSaveSeconds: 15, enabled: { linkedin: false, jobstreet: false, myfuturejobs: true, maukerja: true },
  });
  expect(updateSettings(current, { autoSaveSeconds: null }).autoSaveSeconds).toBeNull();
});

it('saves only the preference changed in the dashboard', async () => {
  const before = readSettings(undefined);
  vi.mocked(request).mockResolvedValue({ ...before, autoSaveSeconds: null });
  const change = vi.fn();
  render(<SettingsPanel settings={before} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Auto-save after'), { target: { value: 'off' } });
  expect(request).toHaveBeenCalledWith('saveSettings', { autoSaveSeconds: null });
  expect(await screen.findByText('Settings saved.')).toBeTruthy();
  expect(change).toHaveBeenCalledWith({ ...before, autoSaveSeconds: null });
});
