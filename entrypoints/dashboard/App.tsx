import { useCallback, useEffect, useState } from 'react';
import { request } from '../../lib/messages';
import type { Settings } from '../../lib/settings';
import type { PendingSummary } from '../../lib/attempts';
import type { JobRecord, JobSummary } from '../../lib/records';
import { dashboardStats } from '../../lib/dashboard';
import { Stats } from '../../ui/Stats';
import { PendingAttempts } from '../../ui/PendingAttempts';
import { resolutionText } from '../../ui/notification';
import { ApplicationTable } from '../../ui/ApplicationTable';
import { SettingsPanel } from '../../ui/SettingsPanel';
import { RecordDialog } from '../../ui/RecordDialog';
import { ExportControls } from '../../ui/ExportControls';

export default function App() {
  const [settings, setSettings] = useState<Settings>();
  const [records, setRecords] = useState<JobSummary[]>();
  const [selection, setSelection] = useState<JobRecord | 'new'>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingSummary[]>([]);

  const refresh = useCallback(async () => {
    const [jobs, attempts] = await Promise.all([request('list', undefined), request('pendingAttempts', undefined)]);
    setRecords(jobs);
    setPending(attempts);
  }, []);

  useEffect(() => {
    const load = () => { void refresh().catch(reason => setError(String(reason))); };
    request('settings', undefined).then(setSettings, reason => setError(String(reason)));
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [refresh]);

  useEffect(() => {
    if (settings && location.hash === '#settings') document.getElementById('settings')?.scrollIntoView();
  }, [settings]);

  return <>
    <header className="app-header"><div className="header-inner">
      <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">✓</span> Job Application Tracker</a>
      <nav aria-label="Dashboard"><a href="#application-log">Applications</a><a href="#data">Data</a><a href="#settings">Settings</a></nav>
    </div></header>
    <main className="workspace" id="top">
      <div className="workspace-title">
        <div><h1>Applications</h1>
          <p className="muted">Track the roles you saved, applied for, and heard back from.</p></div>
        <span className="local-label">Stored on this device</span>
      </div>
      {records && <Stats items={dashboardStats(records)} />}
      {error && <p className="feedback error" role="alert">{error} <button onClick={() => void refresh().then(() => setError(''), reason => setError(String(reason)))}>Retry</button></p>}
      {notice && <p className="feedback" role="status">{notice}</p>}
      <PendingAttempts attempts={pending} onDecision={async (id, decision) => {
        const result = await request('decideAttempt', { id, decision });
        setNotice(resolutionText(result));
        await refresh();
      }} />
      <section className="panel" id="application-log" aria-labelledby="log-title">
        <div className="section-heading">
          <div><h2 id="log-title">Application log</h2>
            <p className="muted">Open a job title to review the saved details.</p>
          </div>
          <button className="primary" onClick={() => setSelection('new')}>+ Add a job</button>
        </div>
        {records ? <ApplicationTable records={records} onOpen={record => {
          void request('getRecord', record.id).then(setSelection, reason => setError(String(reason)));
        }} /> :
          !error && <p className="loading" role="status">Loading your log…</p>}
      </section>
      <ExportControls onImport={refresh} />
      {settings && <SettingsPanel settings={settings} onChange={setSettings} onClear={refresh} />}
      {selection && <RecordDialog key={selection === 'new' ? selection : selection.id} selection={selection} records={records ?? []}
        onClose={() => setSelection(undefined)}
        onChange={async message => {
          setNotice(message);
          setSelection(undefined);
          await refresh().catch(reason => setError(String(reason)));
        }} />}
    </main>
  </>;
}
