import { useState } from 'react';
import { request } from '../lib/messages';
import { platformNames, supportedPlatforms } from '../lib/platforms';
import { countdownOptions, type Countdown, type Settings, type SettingsPatch } from '../lib/settings';
import { Icon } from './Icon';
import { PlatformLogo } from './PlatformLogo';

interface Props {
  settings: Settings;
  onChange(settings: Settings): void;
  onClear?(): Promise<void>;
}

export function SettingsPanel({ settings, onChange, onClear }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(next: SettingsPatch) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      onChange(await request('saveSettings', next));
      setMessage('Settings saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!window.confirm('Delete all local records and pending attempts? This also turns off website detection.')) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      onChange(await request('clearData', 'delete-local-data'));
      await onClear?.();
      setMessage('Local records and attempts deleted. Website detection is off.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not clear tracker data.');
    } finally {
      setBusy(false);
    }
  }

  return <section id="settings" className="panel preferences" aria-labelledby="settings-title">
    <div className="section-heading"><div><h2 id="settings-title">Detection settings</h2>
      <p className="muted">Choose how the tracker watches supported job sites.</p></div></div>
    <div className="settings-grid">
      <div className="setting-group">
        <h3>Confirmation timer</h3>
        <p className="muted">When the site outcome is unclear, save the attempt as unconfirmed after this delay. Choose Off to decide manually.</p>
        <label className="setting-field">Auto-save after<select disabled={busy} value={settings.autoSaveSeconds ?? 'off'} onChange={event => {
          const autoSaveSeconds = event.target.value === 'off' ? null : Number(event.target.value) as Countdown;
          void save({ autoSaveSeconds });
        }}>
          {countdownOptions.map(seconds => <option key={seconds ?? 'off'} value={seconds ?? 'off'}>{seconds === null ? 'Off' : `${seconds} seconds`}</option>)}
        </select></label>
      </div>
      <div className="setting-group">
        <h3>Website detection</h3>
        <p className="muted">Only the supported sites selected here are watched.</p>
        <div className="detection-list">{supportedPlatforms.map(platform => <label className="check platform-check" key={platform}>
          <input type="checkbox" checked={settings.enabled[platform]} disabled={busy} onChange={event => {
            void save({ enabled: { [platform]: event.target.checked } });
          }} />
          <PlatformLogo platform={platform} size={18} />
          <span>Detect on {platformNames[platform]}</span>
        </label>)}</div>
      </div>
    </div>
    <div className="privacy-row">
      <div><h3>Local storage</h3>
        <p className="muted">Records stay in this browser profile. Detection reads listing details and submission feedback. It does not read your form answers or upload files.</p>
        <p className="muted">Export a JSON backup before clearing the log.</p>
      </div>
      <button className="danger" disabled={busy} onClick={() => void clear()}><Icon name="alert" size={16} />Clear tracker data</button>
    </div>
    {message && <p className="feedback-inline" role="status"><Icon name="check" size={15} />{message}</p>}
    {error && <p className="feedback-inline error" role="alert"><Icon name="alert" size={15} />{error}</p>}
  </section>;
}
