import { useCallback, useEffect, useState } from 'react';
import { request } from '../../lib/messages';
import type { Settings } from '../../lib/settings';
import type { PendingSummary } from '../../lib/attempts';
import type { JobRecord, JobSummary } from '../../lib/records';
import { dashboardStats } from '../../lib/dashboard';
import { projectUrl } from '../../lib/project';
import { Stats } from '../../ui/Stats';
import { ApplicationInsights } from '../../ui/ApplicationInsights';
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
      <a className="brand" href="#top"><img src="/icon/32.png" width="30" height="30" alt="" /> Job Application Tracker</a>
      <nav aria-label="Dashboard"><a href="#application-log">Application log</a><a href="#data">Data</a><a href="#settings">Settings</a></nav>
    </div></header>
    <main className="workspace" id="top">
      <div className="workspace-title">
        <div><p className="eyebrow">Your job search</p><h1>Applications</h1>
          <p className="muted">See where you’ve applied and what’s moving forward.</p></div>
        <div className="workspace-actions">
          <span className="local-label">Stored on this device</span>
          <button className="primary" onClick={() => setSelection('new')}>+ Add a job</button>
        </div>
      </div>
      {records && <Stats items={dashboardStats(records)} />}
      {error && <p className="feedback error" role="alert">{error} <button onClick={() => void refresh().then(() => setError(''), reason => setError(String(reason)))}>Retry</button></p>}
      {notice && <p className="feedback" role="status">{notice}</p>}
      <PendingAttempts attempts={pending} onDecision={async (id, decision) => {
        const result = await request('decideAttempt', { id, decision });
        setNotice(resolutionText(result));
        await refresh();
      }} />
      {records && <ApplicationInsights records={records} />}
      <section className="panel" id="application-log" aria-labelledby="log-title">
        <div className="section-heading">
          <div><h2 id="log-title">Application log</h2>
            <p className="muted">Open a job title to review the saved details.</p>
          </div>
        </div>
        {records ? <ApplicationTable records={records} onOpen={record => {
          void request('getRecord', record.id).then(setSelection, reason => setError(String(reason)));
        }} /> :
          !error && <p className="loading" role="status">Loading your log…</p>}
      </section>
      <ExportControls onImport={refresh} />
      {settings && <SettingsPanel settings={settings} onChange={setSettings} onClear={refresh} />}
      <footer className="dashboard-footer">
        <div><strong>Job Application Tracker</strong><p>Built for a private job search.</p></div>
        <nav aria-label="Project links">
          <a href={projectUrl} target="_blank" rel="noreferrer">View on GitHub <span aria-hidden="true">↗</span></a>
          <a href={`${projectUrl}/issues`} target="_blank" rel="noreferrer">Share feedback <span aria-hidden="true">↗</span></a>
        </nav>
      </footer>
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
