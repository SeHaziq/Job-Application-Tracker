import { useCallback, useEffect, useState } from 'react';
import { request } from '../../lib/messages';
import type { Settings } from '../../lib/settings';
import type { PendingSummary } from '../../lib/attempts';
import type { JobRecord, JobSummary } from '../../lib/records';
import { dashboardStats } from '../../lib/dashboard';
import { projectUrl } from '../../lib/project';
import { ApplicationInsights } from '../../ui/ApplicationInsights';
import { ApplicationTable } from '../../ui/ApplicationTable';
import { ExportControls } from '../../ui/ExportControls';
import { Icon } from '../../ui/Icon';
import { PendingAttempts } from '../../ui/PendingAttempts';
import { RecordDialog } from '../../ui/RecordDialog';
import { SettingsPanel } from '../../ui/SettingsPanel';
import { Stats } from '../../ui/Stats';
import { StoreRating } from '../../ui/StoreRating';
import { resolutionText } from '../../ui/notification';

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
      <a className="brand" href="#top">
        <img className="brand-mark" src="/icon/48.png" width="32" height="32" alt="" />
        <span className="brand-text"><strong>Job Application Tracker</strong><small>Private job search</small></span>
      </a>
      <nav className="app-nav" aria-label="Dashboard">
        <a href="#application-log">Application log</a><a href="#data">Data</a><a href="#settings">Settings</a>
      </nav>
    </div></header>
    <main className="workspace" id="top">
      <div className="workspace-title">
        <div className="page-intro"><h1>Applications</h1>
          <p>See where you’ve applied and what’s moving forward.</p></div>
        <div className="workspace-actions">
          <span className="local-label"><Icon name="lock" size={14} />Stored on this device</span>
          <button className="primary" onClick={() => setSelection('new')}><Icon name="plus" size={16} />Add a job</button>
        </div>
      </div>
      {records && <section className="summary-panel" aria-label="Application summary">
        <Stats items={dashboardStats(records)} />
      </section>}
      {error && <p className="feedback error" role="alert">
        <span>{error}</span>
        <button className="feedback-action" onClick={() => void refresh().then(() => setError(''), reason => setError(String(reason)))}>Retry</button>
      </p>}
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
      {settings
        ? <div className="utility-grid">
          <ExportControls onImport={refresh} />
          <SettingsPanel settings={settings} onChange={setSettings} onClear={refresh} />
        </div>
        : <ExportControls onImport={refresh} />}
      <footer className="dashboard-footer">
        <div className="footer-brand">
          <img src="/icon/32.png" width="24" height="24" alt="" />
          <div><strong>Job Application Tracker</strong><p>Built for a private job search.</p></div>
        </div>
        <nav aria-label="Project links">
          <a href={projectUrl} target="_blank" rel="noreferrer">View on GitHub <Icon name="arrowUpRight" size={14} /></a>
          <a href={`${projectUrl}/issues`} target="_blank" rel="noreferrer">Share feedback <Icon name="arrowUpRight" size={14} /></a>
          <StoreRating />
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
