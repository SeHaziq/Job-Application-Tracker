import { useMemo, useState } from 'react';
import { platformNames } from '../lib/platforms';
import { statuses, statusNames, verifications, verificationNames, type JobSummary } from '../lib/records';
import { similarKey } from '../lib/dashboard';

const pageSize = 25;
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function ApplicationTable({ records, onOpen }: { records: JobSummary[]; onOpen(record: JobSummary): void }) {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(0);
  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      const key = similarKey(record);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [records]);

  const visible = useMemo(() => {
    const query = search.toLocaleLowerCase().trim();
    return records.filter(record =>
      (!platform || record.platform === platform) &&
      (!status || record.status === status) &&
      (!verification || (record.verificationStatus ?? 'none') === verification) &&
      (!query || [record.jobTitle, record.companyName, record.jobLocation, record.notes, platformNames[record.platform]]
        .some(value => value?.toLocaleLowerCase().includes(query))),
    ).sort((left, right) => {
      if (sort === 'company') return (left.companyName ?? '').localeCompare(right.companyName ?? '') || left.jobTitle.localeCompare(right.jobTitle);
      const order = (right.appliedAt ?? right.createdAt).localeCompare(left.appliedAt ?? left.createdAt);
      return sort === 'oldest' ? -order : order;
    });
  }, [records, platform, status, verification, search, sort]);

  const maxPage = Math.max(0, Math.ceil(visible.length / pageSize) - 1);
  const current = Math.min(page, maxPage);
  const start = current * pageSize;

  return <>
    <div className="filter-bar">
      <label className="search-field">Search<input type="search" placeholder="Company, job title or location" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
      <label>Platform<select value={platform} onChange={event => { setPlatform(event.target.value); setPage(0); }}>
        <option value="">All platforms</option>
        {Object.entries(platformNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
      </select></label>
      <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}>
        <option value="">All statuses</option>
        {statuses.map(key => <option value={key} key={key}>{statusNames[key]}</option>)}
      </select></label>
      <label>Verification<select value={verification} onChange={event => { setVerification(event.target.value); setPage(0); }}>
        <option value="">Any</option>
        {verifications.map(key => <option value={key} key={key}>{verificationNames[key]}</option>)}
        <option value="none">Saved jobs</option>
      </select></label>
      <label>Sort by<select value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}>
        <option value="latest">Newest date</option>
        <option value="oldest">Oldest date</option>
        <option value="company">Company A–Z</option>
      </select></label>
    </div>
    {visible.length ? <>
      <p className="table-scroll-hint muted">Scroll across for salary, dates, and status.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable application table">
        <table>
          <thead><tr>
            <th scope="col">Company</th><th scope="col">Job title</th><th scope="col">Salary</th><th scope="col">Platform</th>
            <th scope="col">Applied</th><th scope="col">Status</th><th scope="col">Verification</th>
          </tr></thead>
          <tbody>{visible.slice(start, start + pageSize).map(record => {
            const key = similarKey(record);
            return <tr key={record.id}>
              <td className="company-cell">{record.companyName ?? 'Unknown company'}</td>
              <td>
                <button className="text-button" onClick={() => onOpen(record)}>{record.jobTitle}</button>
                {key && (duplicateCounts.get(key) ?? 0) > 1 && <span className="duplicate-label">Possible duplicate</span>}
              </td>
              <td className="salary-cell">{record.salary || <span aria-label="Salary unavailable">—</span>}</td>
              <td>{platformNames[record.platform]}</td>
              <td className="date-cell">{record.appliedAt ? date.format(new Date(record.appliedAt)) : '—'}</td>
              <td><span className={`badge badge-${record.status}`}>{statusNames[record.status]}</span></td>
              <td>{record.verificationStatus
                ? <span className={`badge badge-${record.verificationStatus}`}>{verificationNames[record.verificationStatus]}</span>
                : '—'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <footer className="table-footer">
        <span className="muted">{start + 1}–{Math.min(start + pageSize, visible.length)} of {visible.length} records</span>
        {maxPage > 0 && <div className="actions">
          <button onClick={() => setPage(current - 1)} disabled={current === 0}>Previous</button>
          <button onClick={() => setPage(current + 1)} disabled={current === maxPage}>Next</button>
        </div>}
      </footer>
    </> : <div className="empty" role="status">
      <h3>{records.length ? 'No matching records' : 'Your log is empty'}</h3>
      <p className="muted">{records.length ? 'Try a different search or clear a filter.' : 'Add a job here or use Save current job from the extension toolbar.'}</p>
    </div>}
  </>;
}
