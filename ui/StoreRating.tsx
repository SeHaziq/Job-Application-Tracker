import { edgeStoreUrl } from '../lib/project';

const starPath = 'm12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.4l6.2-.9L12 2.8Z';

export function StoreRating() {
  if (import.meta.env.FIREFOX) return null;
  return <a className="store-rating" href={edgeStoreUrl} target="_blank" rel="noreferrer"
    title="Rate Job Application Tracker on Microsoft Edge">
    <span className="store-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <svg key={index} viewBox="0 0 24 24" fill="currentColor">
        <path d={starPath} />
      </svg>)}
    </span>
    <span>Rate on Microsoft Edge</span>
  </a>;
}
