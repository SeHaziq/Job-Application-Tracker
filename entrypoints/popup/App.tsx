import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { request } from '../../lib/messages';
import { platformNames } from '../../lib/platforms';
import type { CapturedJob } from '../../lib/records';
import { captureTab, currentTab } from '../../lib/current-tab';
import type { Overview } from '../../lib/repository';
import { JobForm } from '../../ui/JobForm';
import { Stats } from '../../ui/Stats';

export default function App() {
  const [tab, setTab] = useState<Awaited<ReturnType<typeof currentTab>>>();
  const [overview, setOverview] = useState<Overview>();
  const [editing, setEditing] = useState<CapturedJob>();
  const [capturing, setCapturing] = useState(false);
  const [previous, setPrevious] = useState<string>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    currentTab().then(result => {
      setTab(result);
      if (!result.jobUrl) return;
      return request('lookup', result)
        .then(record => setPrevious(record?.appliedAt ?? undefined));
    }).catch(reason => setError(String(reason)));
    request('overview', undefined).then(setOverview, reason => setError(String(reason)));
  }, []);
  const platform = tab?.platform ?? 'generic';
  const url = tab?.jobUrl;

  return <main className="popup">
    <header className="popup-header">
      <img src={browser.runtime.getURL('/icon/32.png')} width="28" height="28" alt="" />
      <h1>{editing ? 'Save current job' : 'Job Application Tracker'}</h1>
      {!editing && <a className="popup-settings" href={browser.runtime.getURL('/dashboard.html#settings')}
        target="_blank" rel="noreferrer" aria-label="Settings" title="Settings">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M9.5 4.5 10 2h4l.5 2.5 2 .9 2.2-1.2 2.8 2.8-1.2 2.2.9 2L23 12l-.8 2.8-2.5.5-.9 2 1.2 2.2-2.8 2.8-2.2-1.2-2 .9L12 23l-2-.8-.5-2.5-2-.9-2.2 1.2-2.8-2.8 1.2-2.2-.9-2L1 12l.8-2.8 2.5-.5.9-2L4 4.5 6.8 2l2.7 2.5Z" />
        </svg>
      </a>}
    </header>
    {editing ? <section className="popup-editor" aria-label="Job details">
      {!editing.jobTitle && <p className="popup-message muted" role="status">The listing details are unavailable. {editing.jobUrl
        ? <><a href={editing.jobUrl} target="_blank" rel="noreferrer">Open the listing</a> and try again, or enter the details below.</>
        : 'Enter the details below.'}</p>}
      <JobForm compact initial={editing} onCancel={() => setEditing(undefined)}
        onSave={async (job, status) => {
          const { duplicate } = await request('add', { job, status: status === 'saved' ? 'saved' : 'applied' });
          setNotice(duplicate ? 'This job is already in your log.' : 'Record saved.');
          setEditing(undefined);
          request('overview', undefined).then(setOverview, reason => setError(String(reason)));
        }} />
    </section> : <>
      <section className="popup-capture" aria-label="Current tab">
        <div className="popup-site">
          <span className="popup-site-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v13H4zM4 10h16M7 8h.01M10 8h.01" /></svg>
          </span>
          <div>
            <strong>{url ? new URL(url).hostname : 'Current tab'}</strong>
            <span className="muted">{platform === 'generic' ? 'Manual tracking' : `${platformNames[platform]} · Supported website`}</span>
          </div>
        </div>
        <button className="primary popup-save" disabled={capturing} onClick={async () => {
          setCapturing(true);
          try {
            setEditing(tab ? await captureTab(tab) : { platform });
          } finally {
            setCapturing(false);
          }
        }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          {capturing ? 'Reading listing…' : 'Save current job'}
        </button>
        {previous && <p className="popup-message muted">You applied for this position on {new Date(previous).toLocaleDateString(undefined, { dateStyle: 'long' })}.</p>}
        {notice && <p className="popup-message" role="status">{notice}</p>}
      </section>
      <section className="popup-overview" aria-labelledby="popup-overview-title">
        <h2 id="popup-overview-title">Application log</h2>
        {overview ? <Stats items={[
          ['Applications', overview.total], ['Interviews', overview.interviews],
          ['Offers', overview.offers], ['Unconfirmed', overview.unconfirmed],
        ]} /> : !error && <p className="muted" role="status">Loading totals…</p>}
      </section>
      {error && <p className="popup-message popup-error error" role="alert">{error}</p>}
      <footer className="popup-footer">
        <a href={browser.runtime.getURL('/dashboard.html')} target="_blank" rel="noreferrer">
          Open dashboard
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
        </a>
      </footer>
    </>}
  </main>;
}
