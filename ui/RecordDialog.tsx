import { useEffect, useRef, useState } from 'react';
import type { JobRecord, JobSummary } from '../lib/records';
import { statusNames, verificationNames } from '../lib/records';
import { platformNames } from '../lib/platforms';
import { request } from '../lib/messages';
import { similarKey } from '../lib/dashboard';
import { JobForm } from './JobForm';

interface Props {
  selection: JobRecord | 'new';
  records: JobSummary[];
  onClose(): void;
  onChange(message: string): Promise<void>;
}

export function RecordDialog({ selection, records, onClose, onChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(selection === 'new');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const record = selection === 'new' ? undefined : selection;
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  const similar = record && similarKey(record);
  const matches = similar ? records.filter(other => other.id !== record?.id && similarKey(other) === similar) : [];
  const details = record ? [
    ['Platform', platformNames[record.platform]], ['Applied', record.appliedAt ? new Date(record.appliedAt).toLocaleString() : undefined],
    ['Location', record.jobLocation], ['Company location', record.companyLocation], ['Employment type', record.employmentType],
    ['Work arrangement', record.workArrangement], ['Salary', record.salary], ['Experience', record.experience],
    ['Resume version', record.resumeVersion], ['Listing ID', record.externalJobId],
  ].filter(([, value]) => value) : [];

  async function change(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChange(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this record.');
    } finally {
      setBusy(false);
    }
  }

  return <dialog className="record-dialog" ref={dialog} aria-labelledby="record-heading" onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <div className="dialog-heading">
      <div><p className="eyebrow">{record ? record.companyName ?? 'Unknown company' : 'Manual record'}</p>
        <h2 id="record-heading">{record?.jobTitle ?? 'Add a job'}</h2></div>
      <button className="close-button" aria-label="Close record" disabled={busy} onClick={onClose}>×</button>
    </div>
    {editing ? <JobForm record={record} onCancel={() => record ? setEditing(false) : onClose()}
      onSave={async (job, status, verificationStatus, appliedAt) => {
        if (!record) {
          const result = await request('add', { job, status: status === 'saved' ? 'saved' : 'applied' });
          await onChange(result.duplicate ? 'This vacancy already has a record.' : 'Record saved.');
          return;
        }
        await request('update', { id: record.id, expectedUpdatedAt: record.updatedAt, record: { ...job, status, verificationStatus, appliedAt } });
        await onChange('Changes saved.');
      }} /> : record && <>
      <div className="actions detail-badges">
        <span className={`badge badge-${record.status}`}>{statusNames[record.status]}</span>
        {record.verificationStatus && <span className={`badge badge-${record.verificationStatus}`}>{verificationNames[record.verificationStatus]}</span>}
        {record.jobUrl && <a href={record.jobUrl} target="_blank" rel="noreferrer">Original listing ↗</a>}
      </div>
      <dl className="details-grid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Job description</h3>
      <p className="record-text">{record.jobDescription ?? 'No description saved.'}</p>
      {([['Qualifications', record.qualifications], ['Requirements', record.requirements], ['Notes', record.notes]] as const)
        .map(([title, value]) => value && <section key={title}><h3>{title}</h3><p className="record-text">{value}</p></section>)}
      {matches.length > 0 && <div className="similar">
        <h3>Possible duplicates</h3>
        <p className="muted">These records share the company and title. They may be separate vacancies.</p>
        <ul>{matches.slice(0, 5).map(other => <li key={other.id}>
          {platformNames[other.platform]} · {other.jobLocation ?? 'Unknown location'} · {other.appliedAt ? new Date(other.appliedAt).toLocaleDateString() : 'Saved job'}
        </li>)}</ul>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" disabled={busy} onClick={() => setEditing(true)}>Edit record</button>
        {record.verificationStatus === 'unconfirmed' && <button disabled={busy} onClick={() => void change(() =>
          request('update', { id: record.id, expectedUpdatedAt: record.updatedAt, record: { ...record, verificationStatus: 'user_confirmed' } }),
        'Application verified.')}>Confirm I applied</button>}
        <button className="danger" disabled={busy} onClick={() => {
          if (window.confirm(`Delete “${record.jobTitle}” from the log?`)) void change(() => request('remove', record.id), 'Record deleted.');
        }}>Delete record</button>
      </div>
    </>}
  </dialog>;
}
