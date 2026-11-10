import { statuses, type JobSummary } from './records';

function weekStart(date: Date, offset = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7 + offset * 7);
}

export function applicationInsights(records: JobSummary[], weekCount: number, now = new Date()) {
  const weeks = Array.from({ length: weekCount }, (_, index) => ({
    start: weekStart(now, index - weekCount + 1), count: 0,
  }));
  const byWeek = new Map(weeks.map(week => [week.start.getTime(), week]));
  const byStatus = new Map(statuses.filter(status => status !== 'saved').map(status => [status, 0]));
  for (const record of records) {
    if (record.status === 'saved' || !record.appliedAt) continue;
    byStatus.set(record.status, (byStatus.get(record.status) ?? 0) + 1);
    const applied = new Date(record.appliedAt);
    if (applied > now) continue;
    const week = byWeek.get(weekStart(applied).getTime());
    if (week) week.count++;
  }
  return { weeks, byStatus: [...byStatus] };
}

export function dashboardStats(records: JobSummary[], now = new Date()): [string, number][] {
  const week = weekStart(now);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  let total = 0, weekly = 0, monthly = 0, interviews = 0, offers = 0, rejected = 0, uncertain = 0;
  for (const record of records) {
    if (!record.appliedAt) continue;
    total++;
    const applied = new Date(record.appliedAt);
    if (applied >= week && applied <= now) weekly++;
    if (applied >= month && applied <= now) monthly++;
    if (record.status === 'interview') interviews++;
    if (record.status === 'offer') offers++;
    if (record.status === 'rejected') rejected++;
    if (record.verificationStatus === 'unconfirmed') uncertain++;
  }
  return [
    ['Applications', total], ['This week', weekly], ['This month', monthly],
    ['Interviews', interviews], ['Offers', offers], ['Rejections', rejected], ['Unconfirmed', uncertain],
  ];
}

export function similarKey(record: JobSummary) {
  if (!record.companyName) return;
  return JSON.stringify([record.companyName, record.jobTitle].map(value => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')));
}
