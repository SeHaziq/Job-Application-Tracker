import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const guid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const { EDGE_API_KEY, EDGE_CLIENT_ID, EDGE_PRODUCT_ID, GITHUB_REF_NAME } = process.env;
if (!EDGE_API_KEY || !EDGE_CLIENT_ID || !EDGE_PRODUCT_ID) {
  throw new Error('Set EDGE_API_KEY in Actions secrets and EDGE_CLIENT_ID and EDGE_PRODUCT_ID in Actions variables.');
}
if (!new RegExp(`^${guid}$`, 'i').test(EDGE_PRODUCT_ID)) throw new Error('EDGE_PRODUCT_ID must be the Partner Center Product ID (GUID).');

const { version } = JSON.parse(await readFile('.output/chrome-mv3/manifest.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version) || GITHUB_REF_NAME !== `v${version}`) {
  throw new Error(`The release tag must match the built manifest version v${version}.`);
}

const submissions = `https://api.addons.microsoftedge.microsoft.com/v1/products/${EDGE_PRODUCT_ID}/submissions`;
const credentials = { Authorization: `ApiKey ${EDGE_API_KEY}`, 'X-ClientID': EDGE_CLIENT_ID };

async function request(path, options = {}) {
  const response = await fetch(`${submissions}${path}`, {
    ...options, headers: { ...credentials, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Edge API ${options.method ?? 'GET'} ${path} returned HTTP ${response.status}.`);
  return response;
}

async function submitAndWait(label, path, contentType, body) {
  const response = await request(path, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  const operation = response.headers.get('Location')?.match(new RegExp(`(?:^|/)(${guid})/?$`, 'i'))?.[1];
  if (response.status !== 202 || !operation) throw new Error(`${label} did not return an Edge operation ID.`);
  console.log(`${label} accepted. Operation ${operation}.`);

  for (let check = 0; check < 60; check++) {
    const status = await request(`${path}/operations/${operation}`);
    const result = await status.json();
    if (result.status === 'Succeeded') return;
    if (result.status !== 'InProgress' && result.status !== 'NotStarted') {
      const code = typeof result.errorCode === 'string' && /^\w+$/.test(result.errorCode) ? ` (${result.errorCode})` : '';
      throw new Error(`${label} failed${code}. Check operation ${operation} in Partner Center.`);
    }
    await delay(5000);
  }
  throw new Error(`${label} is still pending. Check operation ${operation} in Partner Center before retrying.`);
}

const zip = await readFile(`.output/job-application-tracker-${version}-chrome.zip`);
await submitAndWait('Package upload', '/draft/package', 'application/zip', zip);
await submitAndWait('Review submission', '', 'application/json', JSON.stringify({ notes: `Release v${version}` }));
console.log(`Edge accepted v${version} for review. Check Partner Center for certification and store availability.`);
