import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { request } from '../../lib/messages';
import { platformNames } from '../../lib/platforms';
import type { CapturedJob } from '../../lib/records';
import { captureTab, currentTab } from '../../lib/current-tab';
import type { Overview } from '../../lib/repository';
import { Icon } from '../../ui/Icon';
import { JobForm } from '../../ui/JobForm';
import { PlatformLogo } from '../../ui/PlatformLogo';
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
      <img className="popup-logo" src={browser.runtime.getURL('/icon/48.png')} width="32" height="32" alt="" />
      <div className="popup-title">
        <h1>{editing ? 'Save current job' : 'Job Application Tracker'}</h1>
        <p>{editing ? 'Review the details before saving.' : 'Private job search'}</p>
      </div>
      {editing
        ? <button type="button" className="icon-button popup-settings" aria-label="Close job form"
          onClick={() => setEditing(undefined)}><Icon name="close" size={18} /></button>
        : <a className="icon-button popup-settings" href={browser.runtime.getURL('/dashboard.html#settings')}
          target="_blank" rel="noreferrer" aria-label="Settings" title="Settings"><Icon name="settings" size={18} /></a>}
    </header>
    {editing ? <section className="popup-editor" aria-label="Job details">
      {!editing.jobTitle && <p className="popup-editor-note" role="status">
        <Icon name="alert" size={16} />
        <span>The listing details are unavailable. {editing.jobUrl
          ? <><a href={editing.jobUrl} target="_blank" rel="noreferrer">Open the listing</a> and try again, or enter the details below.</>
          : 'Enter the details below.'}</span>
      </p>}
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
          <span className="popup-site-icon"><PlatformLogo platform={platform} size={26} /></span>
          <div className="popup-site-copy">
            <span className="popup-site-label">Current tab</span>
            <strong>{url ? new URL(url).hostname : 'No job page open'}</strong>
            <span className="popup-site-status">
              {platform === 'generic'
                ? 'Manual tracking'
                : <><span className="status-dot" aria-hidden="true" />{platformNames[platform]} detection on</>}
            </span>
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
          <Icon name="plus" size={18} />
          {capturing ? 'Reading listing…' : 'Save current job'}
        </button>
        {previous && <p className="popup-history">
          <Icon name="clock" size={15} />
          <span>You applied for this position on {new Date(previous).toLocaleDateString(undefined, { dateStyle: 'long' })}.</span>
        </p>}
        {notice && <p className="popup-message popup-notice" role="status">{notice}</p>}
      </section>
      {error && <p className="popup-message popup-error error" role="alert"><Icon name="alert" size={15} />{error}</p>}
      <section className="popup-overview" aria-labelledby="popup-overview-title">
        <h2 id="popup-overview-title">Application log</h2>
        {overview ? <Stats items={[
          ['Applications', overview.total], ['Interviews', overview.interviews],
          ['Offers', overview.offers], ['Unconfirmed', overview.unconfirmed],
        ]} /> : !error && <p className="muted" role="status">Loading totals…</p>}
      </section>
      <footer className="popup-footer">
        <a className="popup-dashboard-link" href={browser.runtime.getURL('/dashboard.html')} target="_blank" rel="noreferrer">
          Open dashboard
          <Icon name="arrowRight" size={17} />
        </a>
        <ul className="popup-trust" aria-label="Project and privacy">
          <li><Icon name="shieldCheck" size={14} />No ads</li>
          <li><Icon name="lock" size={14} />No tracking</li>
          <li><Icon name="code" size={14} />Open source</li>
        </ul>
      </footer>
    </>}
  </main>;
}
