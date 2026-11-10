import { describe, expect, it } from 'vitest';
import { platformOf } from '../lib/platforms';
import { readSettings } from '../lib/settings';

describe('platform routing', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/34/', 'linkedin'],
    ['https://my.jobstreet.com/job/456', 'jobstreet'],
    ['https://www.jobstreet.com.my/job/456', 'jobstreet'],
    ['https://candidates.myfuturejobs.gov.my/', 'myfuturejobs'],
    ['https://linkedin.com.example.org/jobs/34', 'generic'],
    ['chrome://extensions/', 'generic'],
  ])('routes %s to %s', (url, platform) => {
    expect(platformOf(url)).toBe(platform);
  });
});

it('restores defaults for corrupt settings and honors disabled timers', () => {
  expect(readSettings({ autoSaveSeconds: 4 }).autoSaveSeconds).toBe(10);
  expect(readSettings({ autoSaveSeconds: null }).autoSaveSeconds).toBeNull();
  expect(readSettings({ enabled: { linkedin: false } }).enabled).toEqual({
    linkedin: false, jobstreet: true, myfuturejobs: true,
  });
});
