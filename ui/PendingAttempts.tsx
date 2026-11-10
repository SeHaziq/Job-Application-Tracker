import { useState } from 'react';
import type { PendingSummary } from '../lib/attempts';
import { platformNames } from '../lib/platforms';
import { Icon } from './Icon';

interface Props {
  attempts: PendingSummary[];
  onDecision(id: string, decision: 'accept' | 'decline'): Promise<void>;
}

export function PendingAttempts({ attempts, onDecision }: Props) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');

  async function decide(id: string, decision: 'accept' | 'decline') {
    setBusy(id);
    setError('');
    try {
      await onDecision(id, decision);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the attempt.');
    } finally {
      setBusy(undefined);
    }
  }

  if (attempts.length === 0) return null;
  return <section className="pending-panel" aria-labelledby="pending-heading">
    <div className="pending-heading">
      <span className="pending-icon"><Icon name="alert" size={18} /></span>
      <div><h2 id="pending-heading">Pending confirmation</h2>
        <p>The site did not confirm these submissions. Save them if you applied.</p></div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="pending-list">{attempts.map(attempt => <div className="pending-row" key={attempt.id}>
      <div className="pending-copy"><strong>{attempt.job.jobTitle}</strong>
        <p className="muted">{attempt.job.companyName ?? 'Unknown company'} · {platformNames[attempt.job.platform]}</p>
      </div>
      <div className="actions">
        <button className="primary" disabled={busy !== undefined} onClick={() => void decide(attempt.id, 'accept')}>Yes, save</button>
        <button disabled={busy !== undefined} onClick={() => void decide(attempt.id, 'decline')}>No</button>
      </div>
    </div>)}</div>
  </section>;
}
