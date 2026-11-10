import { useState, type FormEvent } from 'react';
import { jobSchema, type CapturedJob, type Job, type JobRecord, statusNames, statuses, type Status, type Verification } from '../lib/records';
import { platformNames } from '../lib/platforms';

interface Props {
  initial?: CapturedJob;
  record?: JobRecord;
  compact?: boolean;
  onSave(job: Job, status: Status, verification: Verification | null, appliedAt: string | null): Promise<void>;
  onCancel(): void;
}

function localInput(instant: string | null | undefined) {
  if (!instant) return '';
  const date = new Date(instant);
  return new Date(date.valueOf() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function JobForm({ initial, record, compact = false, onSave, onCancel }: Props) {
  const value = record ?? initial;
  const initialDate = localInput(record?.appliedAt);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const keepId = form.get('platform') === value?.platform && form.get('jobUrl') === (value?.jobUrl ?? '');
    const data = jobSchema.safeParse({
      ...value, ...Object.fromEntries(form), externalJobId: keepId ? value?.externalJobId : undefined,
    });
    if (!data.success) {
      setError(data.error.issues[0]?.message ?? 'Check the job details.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const status = form.get('status') as Status;
      const verification = form.get('verify') ? 'user_confirmed' : record?.verificationStatus ?? null;
      const date = form.get('appliedAt');
      const appliedAt = date === initialDate ? record?.appliedAt ?? null :
        typeof date === 'string' && date ? new Date(date).toISOString() : null;
      await onSave(data.data, status, verification, appliedAt);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this job.');
    } finally {
      setBusy(false);
    }
  }

  const platformField = <label>Platform<select name="platform" defaultValue={value?.platform ?? 'generic'}>
    {Object.entries(platformNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></label>;
  const linkField = <label>Original job link<input name="jobUrl" type="url" maxLength={8192} defaultValue={value?.jobUrl} /></label>;
  const textFields = <>
    <label>Job description<textarea name="jobDescription" rows={5} defaultValue={value?.jobDescription} /></label>
    <label>Notes<textarea name="notes" rows={3} defaultValue={value?.notes} /></label>
  </>;

  return <form className="job-form" onSubmit={submit} onInvalidCapture={compact ? event => {
    if (!(event.target instanceof Element)) return;
    const details = event.target.closest('details');
    if (details) details.open = true;
  } : undefined}>
    <div className="form-grid">
      <label className={compact ? 'form-title' : undefined}>Job title<input name="jobTitle" autoFocus required maxLength={500} defaultValue={value?.jobTitle} /></label>
      <label>Company<input name="companyName" maxLength={500} defaultValue={value?.companyName} /></label>
      <label>Location<input name="jobLocation" maxLength={500} defaultValue={value?.jobLocation} /></label>
      {!compact && platformField}
    </div>
    {!compact && linkField}
    <div className="form-grid">
      <label>Status<select name="status" defaultValue={record?.status ?? 'saved'}>
        {(record ? statuses : ['saved', 'applied'] as const).map(status => <option key={status} value={status}>{statusNames[status]}</option>)}
      </select></label>
      {compact && platformField}
      {record && <label>Applied at<input type="datetime-local" name="appliedAt" defaultValue={initialDate} /></label>}
    </div>
    {record?.verificationStatus === 'unconfirmed' && <label className="check"><input name="verify" type="checkbox" /> Confirm I applied</label>}
    {!compact && textFields}
    <details>
      <summary>{compact ? 'Listing details and notes' : 'More job details'}</summary>
      {compact && <div className="compact-fields">{linkField}{textFields}</div>}
      <div className="form-grid optional-fields">
        <label>Company location<input name="companyLocation" maxLength={500} defaultValue={value?.companyLocation} /></label>
        <label>Employment type<input name="employmentType" maxLength={500} defaultValue={value?.employmentType} /></label>
        <label>Work arrangement<input name="workArrangement" maxLength={500} defaultValue={value?.workArrangement} /></label>
        <label>Salary<input name="salary" maxLength={500} defaultValue={value?.salary} /></label>
        <label>Experience<input name="experience" maxLength={500} defaultValue={value?.experience} /></label>
        <label>Resume version<input name="resumeVersion" maxLength={500} defaultValue={value?.resumeVersion} /></label>
        <label>Qualifications<textarea name="qualifications" rows={3} defaultValue={value?.qualifications} /></label>
        <label>Requirements<textarea name="requirements" rows={3} defaultValue={value?.requirements} /></label>
      </div>
    </details>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions">
      <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button>
      <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
    </div>
  </form>;
}
