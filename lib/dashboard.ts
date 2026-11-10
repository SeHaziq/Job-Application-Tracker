import type { JobSummary } from './records';

export function dashboardStats(records: JobSummary[], now = new Date()): [string, number][] {
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
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
