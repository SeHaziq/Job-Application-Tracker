const credentialParam = /^(?:(?:access|refresh|id|auth|oauth|csrf|xsrf|session|bearer)[_-]?(?:token|id|key|code)|auth|authorization|credential|password|passwd|pwd|secret|token|api[_-]?key|signature|sig|code|state|sessionstate|samlresponse|relaystate|x-amz-.+|x-goog-.+)$/i;

function redact(params: URLSearchParams) {
  let changed = false;
  for (const name of [...params.keys()]) {
    if (!credentialParam.test(name)) continue;
    params.delete(name);
    changed = true;
  }
  return changed;
}

export function webUrl(value?: string): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    redact(url.searchParams);
    const hash = url.hash.slice(1);
    const split = hash.indexOf('?');
    const path = split >= 0 ? hash.slice(0, split) : '';
    const params = new URLSearchParams(split >= 0 ? hash.slice(split + 1) : hash);
    if (redact(params)) url.hash = path + (params.size ? (path ? '?' : '') + params.toString() : '');
    return url.href;
  } catch {
    // Invalid URL.
  }
}

export function normalizeUrl(value?: string): string | undefined {
  const safe = webUrl(value);
  if (!safe) return;
  const url = new URL(safe);
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|gclid|fbclid|trk|trackingId)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href;
}
