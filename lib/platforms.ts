const hosts = {
  linkedin: ['www.linkedin.com', 'linkedin.com', 'my.linkedin.com'],
  jobstreet: ['my.jobstreet.com', 'www.jobstreet.com.my', 'jobstreet.com.my'],
  myfuturejobs: ['candidates.myfuturejobs.gov.my', 'www.myfuturejobs.gov.my', 'myfuturejobs.gov.my'],
} as const;

export type SupportedPlatform = keyof typeof hosts;
export type Platform = SupportedPlatform | 'generic';
export const supportedPlatforms = Object.keys(hosts) as SupportedPlatform[];
export const platformNames: Record<Platform, string> = {
  linkedin: 'LinkedIn', jobstreet: 'JobStreet', myfuturejobs: 'MYFutureJobs', generic: 'Other website',
};
export const siteMatches = Object.values(hosts).flatMap(names => names.map(name => `https://${name}/*`));

export function platformOf(input?: string): Platform {
  if (!input) return 'generic';
  try {
    const { protocol, hostname } = new URL(input);
    if (protocol !== 'https:') return 'generic';
    return supportedPlatforms.find(platform => hosts[platform].some(name => name === hostname)) ?? 'generic';
  } catch {
    return 'generic';
  }
}
