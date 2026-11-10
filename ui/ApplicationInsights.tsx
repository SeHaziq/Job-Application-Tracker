import { useState } from 'react';
import { applicationInsights } from '../lib/dashboard';
import { statusNames, type JobSummary } from '../lib/records';

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function ApplicationInsights({ records }: { records: JobSummary[] }) {
  const [range, setRange] = useState(8);
  const { weeks, byStatus } = applicationInsights(records, range);
  const recent = weeks.reduce((total, week) => total + week.count, 0);
  const peak = Math.max(1, ...weeks.map(week => week.count));
  const total = byStatus.reduce((count, [, value]) => count + value, 0);

  return <div className="insights">
    <section className="panel insight" aria-labelledby="activity-title">
      <div className="insight-heading">
        <div><p className="eyebrow">Activity</p><h2 id="activity-title">Applications over time</h2></div>
        <select aria-label="Activity range" value={range} onChange={event => setRange(Number(event.target.value))}>
          <option value={4}>Last 4 weeks</option><option value={8}>Last 8 weeks</option><option value={12}>Last 12 weeks</option>
        </select>
      </div>
      <p className="insight-summary"><strong>{recent}</strong> {recent === 1 ? 'application' : 'applications'} in this period</p>
      {recent ? <ol className="weekly-chart" aria-label="Applications by week, starting Monday">
        {weeks.map(({ start, count }, index) => <li key={start.getTime()} className={index === weeks.length - 1 ? 'current-week' : undefined}>
          <span className="week-track" aria-hidden="true">
            <span className="week-bar" style={{ height: `${count / peak * 100}%` }}><span>{count}</span></span>
          </span>
          <span className="week-date">{shortDate.format(start)}</span><span className="sr-only">, {count} applications</span>
        </li>)}
      </ol> : <div className="insight-empty"><strong>No applications in this period</strong><span>Applications appear here by the week they were submitted.</span></div>}
      <p className="chart-note">Weeks start on Monday · Includes the current week</p>
    </section>
    <section className="panel insight" aria-labelledby="status-title">
      <div className="insight-heading"><div><p className="eyebrow">Pipeline</p><h2 id="status-title">Application status</h2></div></div>
      <p className="insight-summary muted">Current status across all applications</p>
      <ul className="status-chart">
        {byStatus.map(([status, count]) => <li key={status}>
          <div><span>{statusNames[status]}</span><strong>{count}</strong></div>
          <span className="status-track" aria-hidden="true"><span className={`status-bar status-bar-${status}`} style={{ width: `${total ? count / total * 100 : 0}%` }} /></span>
        </li>)}
      </ul>
    </section>
  </div>;
}
