import type { SupportedPlatform } from './platforms';

export const countdownOptions = [5, 10, 15, 30, null] as const;
export type Countdown = typeof countdownOptions[number];

export interface Settings {
  autoSaveSeconds: Countdown;
  enabled: Record<SupportedPlatform, boolean>;
}

export type SettingsPatch = { autoSaveSeconds?: Countdown; enabled?: Partial<Settings['enabled']> };

export const settingsKey = 'tracker-settings';

export function readSettings(value: unknown): Settings {
  const input = value as Partial<Settings> | undefined | null;
  return {
    autoSaveSeconds: countdownOptions.includes(input?.autoSaveSeconds as Countdown)
      ? input!.autoSaveSeconds! : 10,
    enabled: {
      linkedin: input?.enabled?.linkedin !== false,
      jobstreet: input?.enabled?.jobstreet !== false,
      myfuturejobs: input?.enabled?.myfuturejobs !== false,
      maukerja: input?.enabled?.maukerja !== false,
    },
  };
}

export function updateSettings(current: Settings, patch: SettingsPatch) {
  return readSettings({ ...current, ...patch, enabled: { ...current.enabled, ...patch?.enabled } });
}
