import type { Platform } from '../lib/platforms';
import { Icon } from './Icon';

const files: Partial<Record<Platform, string>> = {
  linkedin: 'linkedin.ico',
  jobstreet: 'jobstreet.png',
  myfuturejobs: 'myfuturejobs.png',
  maukerja: 'maukerja.png',
};

export function PlatformLogo({ platform, size = 18 }: { platform: Platform; size?: number }) {
  const file = files[platform];
  if (!file) return <Icon name="globe" size={size} />;
  return <img className="platform-logo" src={`/platform-icons/${file}`} width={size} height={size} alt="" />;
}
