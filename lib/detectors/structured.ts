import type { CapturedJob } from '../records';

type PostingFields = Omit<CapturedJob, 'platform'>;

// Chrome serializes this function for a one-time, user-initiated activeTab capture.
export function readPosting(doc: Document | DocumentFragment = document, href = location.href): PostingFields | null {
  type Data = Record<string, unknown>;
  const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
  const array = (value: unknown): unknown[] => Array.isArray(value) ? value : value == null ? [] : [value];
  const string = (value: unknown) => typeof value === 'string' ? value.trim() || undefined : undefined;
  const text = (value: unknown) => {
    const source = string(value);
    if (!source) return;
    if (!source.includes('<') && !source.includes('&')) return source;
    // Template contents are inert and are never mounted on the page.
    const owner = doc instanceof Document ? doc : doc.ownerDocument;
    const template = owner.implementation.createHTMLDocument().createElement('template');
    try {
      template.innerHTML = source;
    } catch {
      return source;
    }
    template.content.querySelectorAll('script, style, iframe').forEach(element => element.remove());
    template.content.querySelectorAll('p, div, li, br, h1, h2, h3, h4, tr').forEach(element => element.after('\n'));
    return template.content.textContent?.split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n') || undefined;
  };
  const postings: Data[] = [];
  function collect(value: unknown, depth: number) {
    if (depth > 8 || postings.length > 32) return;
    for (const item of array(value).slice(0, 64)) {
      const data = object(item);
      if (array(data['@type']).some(type => typeof type === 'string' && /(?:^|\/)JobPosting$/.test(type))) {
        if (string(data.title)) postings.push(data);
      } else {
        collect(data['@graph'], depth + 1);
        collect(data.mainEntity, depth + 1);
      }
    }
  }
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).slice(0, 24)) {
    const source = script.textContent;
    if (!source || source.length > 2_000_000) continue;
    try {
      collect(JSON.parse(source), 0);
    } catch {
      // Other structured data on the page can still be valid.
    }
  }
  const current = new URL(href);
  const samePosting = (post: Data) => {
    const candidate = string(post.url) ?? string(object(post.mainEntityOfPage)['@id']);
    if (!candidate) return false;
    try {
      const url = new URL(candidate, current);
      if (url.origin !== current.origin || url.pathname.replace(/\/$/, '') !== current.pathname.replace(/\/$/, '')) return false;
      for (const [key, value] of url.searchParams) {
        if (!/^utm_/i.test(key) && current.searchParams.get(key) !== value) return false;
      }
      return !url.hash || url.hash === current.hash;
    } catch { return false; }
  };
  const matching = postings.filter(samePosting);
  const post = matching.length === 1 ? matching[0] : postings.length === 1 ? postings[0] : undefined;
  if (!post) return null;
  const company = object(array(post.hiringOrganization)[0]);
  const address = (place: unknown) => {
    const location = object(place);
    const data = object(location.address ?? place);
    return string(location.address) ?? string(place) ??
      ([data.addressLocality, data.addressRegion, string(data.addressCountry) ?? object(data.addressCountry).name]
        .map(string).filter(Boolean).join(', ') || undefined);
  };
  const salary = object(post.baseSalary);
  const range = object(salary.value);
  const amount = [range.minValue, range.maxValue].filter(value => typeof value === 'number' || string(value)).join('–') ||
    (typeof range.value === 'number' ? String(range.value) : string(range.value));
  const employment: Record<string, string> = {
    FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', CONTRACTOR: 'Contract',
    TEMPORARY: 'Temporary', INTERN: 'Internship', VOLUNTEER: 'Volunteer', PER_DIEM: 'Per diem',
  };
  const identifier = object(post.identifier).value;
  const months = object(post.experienceRequirements).monthsOfExperience;
  return {
    jobTitle: string(post.title),
    companyName: string(company.name),
    companyLocation: address(company.address ?? company.location),
    jobLocation: array(post.jobLocation).map(address).filter(Boolean).join(' / ') || undefined,
    employmentType: array(post.employmentType).map(string).filter(Boolean).map(type => employment[type!] ?? type).join(', ') || undefined,
    workArrangement: array(post.jobLocationType).includes('TELECOMMUTE') ? 'Remote' : undefined,
    jobDescription: text(post.description),
    qualifications: text(post.qualifications),
    requirements: text(post.responsibilities) ?? text(post.skills),
    experience: string(post.experienceRequirements) ?? (typeof months === 'number' ? `${months} months` : undefined),
    salary: amount ? [string(salary.currency), amount, string(range.unitText)].filter(Boolean).join(' ') : string(post.baseSalary),
    externalJobId: string(identifier) ?? (typeof identifier === 'number' ? String(identifier) : undefined),
  };
}
