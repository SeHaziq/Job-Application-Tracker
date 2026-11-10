import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const extension = resolve('.output/chrome-mv3');
const qa = resolve('.output/qa');
await mkdir(qa, { recursive: true });

// Keep Chromium's temporary profile under a normal path on sandboxed Windows hosts.
process.env.TEMP = qa;
process.env.TMP = qa;

const edge = process.env.JAT_SMOKE_EDGE === '1';
const browser = await chromium.launchPersistentContext('', {
  channel: edge ? 'msedge' : 'chromium',
  headless: true,
  ignoreDefaultArgs: edge ? ['--disable-extensions'] : undefined,
  args: edge ? ['--enable-unsafe-extension-debugging'] : [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  viewport: { width: 1440, height: 960 },
});
browser.setDefaultTimeout(10_000);

function listing(url) {
  if (url.hostname === 'www.maukerja.my' && /^(?:\/en)?\/jobsearch\/direct-card$/.test(url.pathname)) {
    const english = url.pathname.startsWith('/en/');
    return `<!doctype html>
    <mkrb-job-card job-id="Selected123" job-title="Selected analyst" company="Selected employer"></mkrb-job-card>
    <mkrb-job-card job-id="Clicked456" job-title="Commercial Intelligence" company="Clicked employer" apply="apply"></mkrb-job-card>
    <aside>Selected analyst</aside><div id="toast"><span>${english ? 'Application submitted successfully!' : 'Permohonan berjaya dihantar!'}</span></div>
    <script>
      const root = document.querySelector('[job-id="Clicked456"]').attachShadow({ mode: 'open' });
      root.innerHTML = '<button type="button" class="apply raised"><span>${english ? 'Apply Now' : 'Mohon'}</span></button>';
      root.querySelector('button').onclick = () => {
        document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><button type="button" class="chat-preview-action-btn is-primary" id="send">${english ? 'Submit Now' : 'Hantar Sekarang'}</button></div>');
        document.querySelector('#send').onclick = () => document.querySelector('[role="dialog"]').remove();
      };
    </script>`;
  }
  if (url.hostname === 'www.maukerja.my' && url.pathname === '/jobsearch/executive-assistant-jobs') return `<!doctype html>
    <mkrb-job-card job-id="46E1xTqQG1" job-title="Executive Assistant" company="Wrong employer"></mkrb-job-card>
    <mkrb-job-card job-id="QldTOw3DOV" job-title="Executive Assistant" company="Selected employer"
      salary="MYR2,500 - MYR3,500 Sebulan" job-types='[{"label":"Sepenuh Masa"}]'
      locations='[{"label":"KL City"},{"label":"WP Kuala Lumpur"}]'></mkrb-job-card>
    <button id="select-job">View selected vacancy</button><aside hidden><h2>Executive Assistant</h2></aside>
    <script>
      document.querySelector('#select-job').onclick = () => {
        history.replaceState(null, '', '?curentJobId=QldTOw3DOV');
        document.querySelector('aside').hidden = false;
      };
    </script>`;
  if (url.hostname === 'www.maukerja.my') return `<!doctype html><h1>Search results</h1>
    <div class="modal is-active"><div class="modal-content"><div class="lg:sticky lg:top-6">
      <div><h2>MauKerja analyst</h2><a href="/company/northwind">Northwind</a></div>
      <div><div>MYR4,000 - MYR5,000 Sebulan</div><div>Sepenuh Masa</div><div>Bandar Kuala Lumpur</div></div>
      <p>Mohon kerja ini sebagai:</p><button type="button" id="apply"><span>${url.searchParams.get('curentJobId') === '80wGVozgRF' ? 'Mohon' : 'Mohon Segera'}</span></button>
    </div></div></div><script>
      document.querySelector('#apply').onclick = event => {
        document.querySelector('.modal').remove();
        if (event.currentTarget.textContent === 'Mohon') {
          document.body.insertAdjacentHTML('beforeend', '<div class="modal is-active"><div class="modal-content"><button type="button" id="send"><span>Hantar Sekarang</span></button></div></div>');
          document.querySelector('#send').onclick = () => document.querySelector('.modal').remove();
        } else {
          history.replaceState(null, '', location.pathname);
        }
      };
    </script>`;
  if (url.hostname === 'www.linkedin.com' && url.pathname === '/jobs/search-results/') return `<!doctype html>
    <main><aside><a href="/jobs/view/51/">Search card</a></aside><section>
    <a href="/company/northwind/">Northwind</a>
    <div data-display-contents="true"><p><a href="/jobs/view/51/?trackingId=fixture">LinkedIn engineer 51</a></p></div>
    <p>Kuala Lumpur · 1 week ago · Over 100 applicants</p>
    <button id="start">Easy Apply</button><button>Save</button></section><div id="confirmation"></div>
    <dialog><h2>Apply to Northwind</h2><footer>
      <button id="next">Next</button><button id="review" hidden>Review</button>
      <button id="submit" type="button" hidden><span>Submit application</span></button>
    </footer></dialog></main><script>
      const dialog = document.querySelector('dialog');
      document.querySelector('#start').onclick = () => dialog.showModal();
      document.querySelector('#next').onclick = () => { document.querySelector('#review').hidden = false; };
      document.querySelector('#review').onclick = () => { document.querySelector('#submit').hidden = false; };
      document.querySelector('#submit').onclick = () => {
        dialog.close();
        setTimeout(() => {
          document.querySelector('#confirmation').attachShadow({ mode: 'open' }).innerHTML =
            '<div role="dialog" aria-labelledby="post-apply-modal"><h3 class="jpac-modal-header">Your application was sent to Northwind!</h3></div>';
        }, 750);
      };
    </script>`;
  if (url.pathname === '/job/58/apply') return '<!doctype html><main><h1>Apply for this job</h1><form><input></form></main>';
  if (url.pathname === '/job/59/apply/success') return `<!doctype html><main><h1>Keep it up, applicant</h1>
    <p>Your application has been sent to <span>Northwind Industries</span></p>
    <h2>You might also like</h2><h3>Unrelated recommended job</h3></main>`;
  if (url.pathname === '/job/60/apply/review') return `<!doctype html><main>
    <button id="complete">Finish simulated application</button>
    </main><script>
      document.querySelector('#complete').onclick = () => {
        history.pushState(null, '', '/job/60/apply/success?sol=fixture');
        setTimeout(() => {
          document.querySelector('main').innerHTML = '<p>Your application has been sent to Northwind</p><h2 data-automation="job-detail-title">Unrelated recommendation</h2>';
        }, 100);
      };
    </script>`;
  if (url.pathname === '/job/52') return `<!doctype html><main>
    <h1 data-automation="job-detail-title">JobStreet engineer 52</h1>
    <a href="/job/52/apply?sol=fixture" target="_blank" rel="noopener">Quick apply</a></main>`;
  if (url.pathname === '/job/52/apply') return '<!doctype html><main><a href="/job/52/apply/review?sol=fixture">Continue</a></main>';
  if (url.pathname === '/job/52/apply/review') return `<!doctype html><form action="/job/52/apply/complete">
    <button type="submit" data-testid="review-submit-application"><span>Submit application</span></button>
    </form><div role="status">Application submitted</div>`;
  if (url.pathname === '/job/52/apply/complete') return '<!doctype html><div role="status">Application submitted</div>';
  if (url.pathname === '/job/55/apply/review') return `<!doctype html><div>
    <button type="submit" data-testid="review-submit-application"><span>Submit application</span></button></div>`;
  if (url.hostname === 'candidates.myfuturejobs.gov.my' && url.searchParams.get('jobId') === '57') return `<!doctype html>
    <main><div class="vacancy-info-02"><h1 class="vacancy-info-02-title-main-text">MYFutureJobs engineer 57</h1></div>
      <button id="open">Apply</button><section hidden>
        <swipe-button data-test="swipe-applyModal-button--accept"><button id="accept" type="button"><span>Apply</span></button></swipe-button>
      </section>
    </main><script>
      document.querySelector('#open').onclick = () => {
        history.pushState(null, '', location.href + '&apply=true');
        document.querySelector('section').hidden = false;
      };
      document.querySelector('#accept').onclick = () => {
        history.replaceState(null, '', location.href.replace('&apply=true', ''));
        document.querySelector('main').innerHTML = '<h1>Thank you for your application!</h1>';
      };
    </script>`;
  if (url.pathname === '/search-jobs/description') return `<!doctype html><div class="vacancy-info-02">
    <h1 class="vacancy-info-02-title-main-text">MYFutureJobs capture fixture</h1>
    <h2 class="vacancy-info-02-title-company">Northwind</h2>
    <div class="vacancy-description"><div class="description-container"><span class="description">Fixture vacancy details.</span></div></div>
  </div>`;
  const id = url.pathname.match(/\d+/)?.[0];
  const linkedin = url.hostname.includes('linkedin');
  const jobstreet = url.hostname.includes('jobstreet');
  const platform = linkedin ? 'LinkedIn' : jobstreet ? 'JobStreet' : 'MYFutureJobs';
  const title = `${platform} engineer ${id}`;
  const start = linkedin ? 'Easy Apply' : 'Apply';
  const final = linkedin || jobstreet ? 'Submit application' : 'Apply';
  const scope = linkedin ? 'class="jobs-easy-apply-modal"' : jobstreet ? 'data-automation="job-application-form"' : '';
  const next = linkedin ? 'Review' : 'Next';
  const result = url.searchParams.get('result');
  const feedback = result === 'success' ? 'Application sent' : result === 'failure' ? 'Your application could not be submitted.' : '';
  const role = result === 'failure' ? 'alert' : 'status';
  const stale = url.searchParams.has('stale') ? '<div role="status">Application submitted</div>' : '';
  const keepForm = url.searchParams.has('retry');

  return `<!doctype html><html lang="en"><head><title>${title}</title>
    <script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting', title, hiringOrganization: { name: 'Northwind' }, description: '<p>Fixture role details.</p>',
    })}</script></head>
    <body><main><h1>${title}</h1><button id="start">${start}</button>
      <div id="application" role="dialog" hidden ${scope}><h2>Apply for ${title}</h2>
        <button id="next">${next}</button><button id="submit" hidden>${final}</button>
      </div><div id="feedback" role="${role}"></div>${stale}</main>
      <script>
        const scope = document.getElementById('application');
        document.getElementById('start').onclick = () => { scope.hidden = false; };
        document.getElementById('next').onclick = () => { document.getElementById('submit').hidden = false; };
        document.getElementById('submit').onclick = () => {
          scope.hidden = ${!keepForm};
          document.getElementById('feedback').textContent = ${JSON.stringify(feedback)};
        };
      </script>
    </body></html>`;
}

async function eventually(read, predicate, description, wait = 7000) {
  const stop = Date.now() + wait;
  do {
    const result = await read();
    if (predicate(result)) return result;
    await delay(100);
  } while (Date.now() < stop);
  assert.fail(description);
}

try {
  if (edge) {
    const session = await browser.browser().newBrowserCDPSession();
    await session.send('Extensions.loadUnpacked', { path: extension });
    await session.detach();
  }
  const worker = browser.serviceWorkers()[0] ?? await browser.waitForEvent('serviceworker');
  const origin = new URL(worker.url()).origin.replace(/^null$/, `chrome-extension://${new URL(worker.url()).host}`);
  const errors = [];
  browser.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && page.url().startsWith(origin)) errors.push(message.text());
    });
  });
  await browser.route(/^https:\/\/(www\.linkedin\.com|my\.jobstreet\.com|candidates\.myfuturejobs\.gov\.my|www\.maukerja\.my)\//, route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['/job/52', '/job/60'].includes(url.pathname) && !request.isNavigationRequest()) return route.fulfill({ status: 403 });
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: listing(url) });
  });

  const dashboard = await browser.newPage();
  await dashboard.goto(`${origin}/dashboard.html`);
  await dashboard.getByText('Your log is empty').waitFor();
  const send = (type, input) => dashboard.evaluate(async ({ type, input }) => {
    const response = await globalThis.chrome.runtime.sendMessage({ channel: 'tracker', type, input });
    if (!response?.ok) throw new Error(response?.error ?? 'No worker response');
    return response.value;
  }, { type, input });

  if (edge) {
    await browser.route('https://example.test/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Unsupported site</title>' }));
    const listing = await browser.newPage();
    const url = 'https://my.jobstreet.com/job/58';
    await listing.goto(url);
    await listing.bringToFront();
    const tabId = await dashboard.evaluate(async () => {
      const [tab] = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
      return tab.id;
    });
    const toolbarTitle = () => dashboard.evaluate(id => globalThis.chrome.action.getTitle({ tabId: id }), tabId);
    const supported = title => title.endsWith('Supported site');
    await eventually(toolbarTitle, supported, 'Supported tab did not update its toolbar action');
    const session = await browser.browser().newBrowserCDPSession();
    const openAction = async url => {
      const { targetInfos } = await session.send('Target.getTargets', { filter: [{ type: 'tab' }] });
      await session.send('Extensions.triggerAction', { id: new URL(origin).hostname, targetId: targetInfos.find(target => target.url === url).targetId });
    };
    await openAction(url);
    const measure = () => dashboard.evaluate(() => {
      const view = globalThis.chrome.extension.getViews({ type: 'popup' })[0];
      if (!view) return null;
      const doc = view.document;
      return {
        width: view.innerWidth,
        overflow: doc.documentElement.scrollWidth - doc.documentElement.clientWidth,
        host: doc.querySelector('.popup-site strong')?.textContent,
        overview: doc.body.innerText.includes('Unconfirmed'),
        title: doc.querySelector('input[name=jobTitle]')?.value,
        company: doc.querySelector('input[name=companyName]')?.value,
        location: doc.querySelector('input[name=jobLocation]')?.value,
        salary: doc.querySelector('input[name=salary]')?.value,
        saveVisible: [...doc.querySelectorAll('button')].some(button =>
          button.textContent === 'Save record' && button.getBoundingClientRect().bottom <= view.innerHeight),
      };
    });
    const home = await eventually(measure, view => view?.host === 'my.jobstreet.com' && view.overview, 'Edge toolbar popup did not load');
    assert.ok(home.width >= 360 && home.overflow <= 0, `Edge toolbar popup was ${home.width}px wide with ${home.overflow}px overflow`);
    const clickSave = () => dashboard.evaluate(() => {
      const popup = globalThis.chrome.extension.getViews({ type: 'popup' })[0];
      [...popup.document.querySelectorAll('button')].find(button => button.textContent.includes('Save current job')).click();
    });
    await clickSave();
    const form = await eventually(measure, view => view?.title === 'JobStreet engineer 58', 'Edge toolbar popup did not fill the save form');
    assert.equal(form.width, home.width);
    assert.ok(form.overflow <= 0);
    await dashboard.evaluate(() => {
      const popup = globalThis.chrome.extension.getViews({ type: 'popup' })[0];
      popup.document.querySelector('form details').open = true;
    });
    const expanded = await eventually(measure, view => view?.saveVisible, 'The save button was clipped with details expanded');
    assert.equal(expanded.width, home.width);
    assert.ok(expanded.overflow <= 0);
    await listing.goto('https://example.test/');
    await eventually(toolbarTitle, title => title === 'Job Application Tracker', 'Toolbar action did not reset after leaving the supported site');
    await listing.goBack();
    await eventually(toolbarTitle, supported, 'Toolbar action did not recover on back navigation');
    await listing.goto('https://www.maukerja.my/jobsearch/executive-assistant-jobs');
    await listing.locator('#select-job').click();
    await openAction(listing.url());
    await eventually(measure, view => view?.host === 'www.maukerja.my', 'MauKerja toolbar popup did not open');
    await clickSave();
    const maukerja = await eventually(measure, view => view?.title === 'Executive Assistant', 'MauKerja inline vacancy did not autofill');
    assert.equal(maukerja.company, 'Selected employer');
    assert.equal(maukerja.location, 'KL City, WP Kuala Lumpur');
    assert.equal(maukerja.salary, 'MYR2,500 - MYR3,500 Sebulan');
    await listing.close();
    await session.detach();
    console.log('Native Edge popup kept its width and autofilled the selected inline MauKerja vacancy.');
  }

  const popup = await browser.newPage();
  await popup.setViewportSize({ width: 368, height: 600 });
  await popup.goto(`${origin}/popup.html`);
  await popup.getByRole('heading', { name: 'Job Application Tracker' }).waitFor();
  await popup.getByText('Unconfirmed', { exact: true }).waitFor();
  await popup.locator('.popup').screenshot({ path: resolve(qa, 'popup-overview.png') });
  await popup.getByRole('button', { name: 'Save current job' }).click();
  await popup.getByLabel('Job title').fill('Data Analyst');
  await popup.getByLabel('Company', { exact: true }).fill('Northwind Analytics');
  await popup.getByLabel('Location', { exact: true }).fill('Kuala Lumpur');
  await popup.getByLabel('Platform').selectOption('jobstreet');
  await popup.locator('.popup').screenshot({ path: resolve(qa, 'popup-save.png') });
  await popup.close();
  console.log('Popup and dashboard loaded with a running MV3 worker.');

  async function capture(url) {
    const page = await browser.newPage();
    try {
      await page.goto(url);
      await page.bringToFront();
      return await eventually(() => dashboard.evaluate(async () => {
        const [tab] = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
        return globalThis.chrome.tabs.sendMessage(tab.id, { channel: 'tracker-probe' }, { frameId: 0 }).catch(() => null);
      }), job => Boolean(job?.jobTitle), 'Save current job did not return listing fields');
    } finally {
      await page.close();
    }
  }

  const vacancy = await capture('https://candidates.myfuturejobs.gov.my/search-jobs/description?jobId=fixture');
  assert.equal(vacancy.jobTitle, 'MYFutureJobs capture fixture');
  assert.equal(vacancy.companyName, 'Northwind');
  assert.equal(vacancy.jobDescription, 'Fixture vacancy details.');
  const form = await capture('https://my.jobstreet.com/job/58/apply?sol=fixture');
  assert.equal(form.jobTitle, 'JobStreet engineer 58');
  assert.equal(form.companyName, 'Northwind');
  assert.equal(form.jobUrl, 'https://my.jobstreet.com/job/58');
  const linkedInCapture = await capture('https://www.linkedin.com/jobs/search-results/?currentJobId=51&trackingId=fixture');
  assert.equal(linkedInCapture.jobTitle, 'LinkedIn engineer 51');
  assert.equal(linkedInCapture.companyName, 'Northwind');
  assert.equal(linkedInCapture.jobLocation, 'Kuala Lumpur');
  console.log('Save current job captured the LinkedIn and MYFutureJobs detail panels and the JobStreet apply route.');

  const success = await browser.newPage();
  await success.goto('https://my.jobstreet.com/job/59/apply/success?sol=fixture');
  const confirmedFromPage = await eventually(() => send('exportPage'), records =>
    records.some(record => record.externalJobId === '59' && record.jobTitle === 'JobStreet engineer 59'),
  'JobStreet success page did not recover the application and enrich it from the public listing');
  const recovered = confirmedFromPage.find(record => record.externalJobId === '59');
  assert.equal(recovered.verificationStatus, 'site_confirmed');
  assert.equal(recovered.companyName, 'Northwind Industries');
  assert.equal(recovered.jobUrl, 'https://my.jobstreet.com/job/59');
  const successNotice = success.locator('job-application-tracker-notice');
  await successNotice.waitFor({ state: 'attached' });
  await success.screenshot({ path: resolve(qa, 'notification-countdown.png'), animations: 'disabled', clip: { x: 1040, y: 0, width: 400, height: 130 } });
  await successNotice.waitFor({ state: 'detached' });
  await success.reload();
  await success.locator('p').filter({ hasText: 'Your application has been sent' }).waitFor();
  assert.equal((await send('exportPage')).filter(record => record.externalJobId === '59').length, 1);
  await success.close();
  await send('remove', recovered.id);
  const transition = await browser.newPage();
  await transition.goto('https://my.jobstreet.com/job/60/apply/review');
  await transition.locator('#complete').click();
  const withoutListing = await eventually(() => send('exportPage'), records => records.some(record => record.externalJobId === '60'),
    'JobStreet in-tab success did not save after the banner appeared');
  const unknown = withoutListing.find(record => record.externalJobId === '60');
  assert.equal(unknown.verificationStatus, 'site_confirmed');
  assert.equal(unknown.jobTitle, 'Job title unavailable');
  assert.equal(unknown.companyName, 'Northwind');
  await transition.close();
  await send('remove', unknown.id);
  console.log('JobStreet success recovered after page load and in-tab navigation, including a blocked listing refetch.');

  await dashboard.getByRole('button', { name: 'Add a job' }).click();
  await dashboard.getByLabel('Job title').fill('=Fixture Engineer');
  await dashboard.getByLabel('Company', { exact: true }).fill('Fixture Company');
  await dashboard.getByText('More job details', { exact: true }).click();
  await dashboard.getByLabel('Salary').fill('RM 5,000–RM 6,000 per month');
  await dashboard.getByLabel('Job description').fill('A'.repeat(36_000));
  await dashboard.getByRole('dialog').locator('select[name=status]').selectOption('applied');
  await dashboard.getByRole('button', { name: 'Save record' }).click();
  await dashboard.getByRole('cell', { name: 'RM 5,000–RM 6,000 per month' }).waitFor();
  await dashboard.getByRole('button', { name: '=Fixture Engineer' }).click();
  await dashboard.getByRole('button', { name: 'Edit record' }).click();
  await dashboard.getByRole('dialog').locator('select[name=status]').selectOption('interview');
  await dashboard.getByRole('button', { name: 'Save record' }).click();
  await dashboard.locator('tbody').getByText('Interview', { exact: true }).waitFor();
  console.log('Manual recording, description persistence and status editing passed.');

  async function start(url) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.locator('#start').click();
    await page.locator('#next').click();
    return page;
  }

  const linkedin = await start('https://www.linkedin.com/jobs/search-results/?currentJobId=51&trackingId=fixture');
  await linkedin.locator('#review').click();
  assert.equal((await send('exportPage')).length, 1);
  assert.deepEqual(await send('pendingAttempts'), []);
  await linkedin.locator('#submit span').click();
  const confirmed = await eventually(() => send('exportPage'),
    jobs => jobs.some(record => record.externalJobId === '51' && record.jobTitle === 'LinkedIn engineer 51' &&
      record.companyName === 'Northwind' && record.jobLocation === 'Kuala Lumpur' && record.verificationStatus === 'site_confirmed'),
    'LinkedIn Easy Apply shadow confirmation did not save the selected vacancy');
  assert.equal(confirmed.length, 2);
  await linkedin.close();
  console.log('LinkedIn native Easy Apply tracked the selected vacancy and verified its shadow dialog.');

  const portal = await browser.newPage();
  await portal.goto('https://candidates.myfuturejobs.gov.my/search-jobs/description?jobId=57');
  await portal.locator('#open').click();
  assert.deepEqual(await send('pendingAttempts'), []);
  await portal.locator('#accept span').click();
  const portalRecords = await eventually(() => send('exportPage'),
    jobs => jobs.some(record => record.externalJobId === '57' && record.verificationStatus === 'site_confirmed'),
    'MYFutureJobs page heading did not confirm the submitted vacancy');
  await send('remove', portalRecords.find(record => record.externalJobId === '57').id);
  await portal.close();

  await dashboard.getByLabel('Auto-save after').selectOption('off');
  await dashboard.getByText('Settings saved.').waitFor();
  const maukerjaUrl = 'https://www.maukerja.my/jobsearch/data-analyst-jobs-in-kuala-lumpur?curentJobId=QldTOw3DOV';
  const maukerjaCapture = await capture(maukerjaUrl);
  assert.equal(maukerjaCapture.jobTitle, 'MauKerja analyst');
  assert.equal(maukerjaCapture.companyName, 'Northwind');
  assert.equal(maukerjaCapture.jobLocation, 'Bandar Kuala Lumpur');
  assert.equal(maukerjaCapture.salary, 'MYR4,000 - MYR5,000 Sebulan');
  for (const [jobId, twoStep] of [['QldTOw3DOV', false], ['80wGVozgRF', true]]) {
    const maukerja = await browser.newPage();
    await maukerja.goto(maukerjaUrl.replace('QldTOw3DOV', jobId));
    assert.deepEqual(await send('pendingAttempts'), []);
    await maukerja.locator('#apply span').click();
    if (twoStep) {
      await maukerja.locator('#send').waitFor();
      assert.deepEqual(await send('pendingAttempts'), []);
      assert.ok(!(await send('exportPage')).some(record => record.platform === 'maukerja'));
      await maukerja.locator('#send span').click();
    }
    await maukerja.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
    assert.ok(!(await send('exportPage')).some(record => record.platform === 'maukerja'));
    await dashboard.reload();
    const maukerjaAttempt = dashboard.locator('.pending-row', { hasText: 'MauKerja analyst' });
    await maukerjaAttempt.getByRole('button', { name: 'Yes, save' }).click();
    await dashboard.getByRole('button', { name: 'MauKerja analyst' }).waitFor();
    const maukerjaRecord = (await send('exportPage')).find(record => record.platform === 'maukerja');
    assert.equal(maukerjaRecord.externalJobId, jobId);
    assert.equal(maukerjaRecord.verificationStatus, 'user_confirmed');
    await send('remove', maukerjaRecord.id);
    await maukerja.close();
  }
  console.log('MauKerja tracked both final buttons and left the application pending until user confirmation.');
  for (const [locale, search] of [['', '?curentJobId=Selected123'], ['', ''], ['/en', '?curentJobId=Selected123']]) {
    const english = locale === '/en';
    const direct = await browser.newPage();
    await direct.goto(`https://www.maukerja.my${locale}/jobsearch/direct-card${search}`);
    await direct.getByRole('button', { name: english ? 'Apply Now' : 'Mohon', exact: true }).click();
    assert.deepEqual(await send('pendingAttempts'), []);
    await direct.getByRole('button', { name: english ? 'Submit Now' : 'Hantar Sekarang' }).click();
    const pending = await eventually(() => send('pendingAttempts'), attempts =>
      attempts.some(attempt => attempt.job.companyName === 'Clicked employer'), 'Direct MauKerja application did not keep the clicked card');
    assert.equal(pending.length, 1);
    await direct.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
    assert.ok(!(await send('exportPage')).some(record => record.platform === 'maukerja'));
    await direct.locator('#toast').evaluate(node => { node.hidden = true; });
    await direct.evaluate(text => {
      setTimeout(() => {
        const toast = document.createElement('p');
        toast.textContent = text;
        document.body.append(toast);
      }, 250);
    }, english ? 'Application submitted successfully!' : 'Permohonan berjaya dihantar!');
    const records = await eventually(() => send('exportPage'), records => records.some(record => record.platform === 'maukerja'),
      'Fresh MauKerja success toast did not save the direct application');
    const record = records.find(record => record.platform === 'maukerja');
    assert.equal(record.externalJobId, 'Clicked456');
    assert.equal(record.verificationStatus, 'site_confirmed');
    await send('remove', record.id);
    await direct.close();
  }
  const changedSelection = await browser.newPage();
  await changedSelection.goto('https://www.maukerja.my/jobsearch/direct-card?curentJobId=Selected123');
  await changedSelection.getByRole('button', { name: 'Mohon', exact: true }).click();
  await changedSelection.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<mkrb-job-card job-id="Other789" job-title="Unrelated vacancy"></mkrb-job-card>');
    history.replaceState(null, '', '?curentJobId=Other789');
  });
  await changedSelection.getByRole('button', { name: 'Hantar Sekarang' }).click();
  await changedSelection.locator('job-application-tracker-notice').waitFor({ state: 'attached', timeout: 1200 })
    .then(() => assert.fail('A changed MauKerja selection started a confirmation'), error => {
      if (error.name !== 'TimeoutError') throw error;
    });
  assert.deepEqual(await send('pendingAttempts'), []);
  await changedSelection.close();
  console.log('MauKerja attributed a fresh success toast to the clicked shadow card, with or without another selected vacancy.');
  const jobstreetListing = await browser.newPage();
  await jobstreetListing.goto('https://my.jobstreet.com/job/52');
  const nextTab = browser.waitForEvent('page');
  await jobstreetListing.getByRole('link', { name: 'Quick apply' }).click();
  const jobstreet = await nextTab;
  await jobstreet.waitForURL('**/job/52/apply?sol=fixture');
  assert.deepEqual(await send('pendingAttempts'), []);
  await jobstreet.getByRole('link', { name: 'Continue' }).click();
  assert.deepEqual(await send('pendingAttempts'), []);
  await jobstreetListing.close();
  await jobstreet.getByTestId('review-submit-application').click();
  await jobstreet.waitForURL(url => url.pathname === '/job/52/apply/complete');
  await jobstreet.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  await jobstreet.reload();
  await jobstreet.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  const parallel = await start('https://candidates.myfuturejobs.gov.my/job/56');
  await parallel.locator('#submit').click();
  await parallel.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  await dashboard.reload();
  const jobstreetAttempt = dashboard.locator('.pending-row', { hasText: 'JobStreet engineer 52' });
  const otherAttempt = dashboard.locator('.pending-row', { hasText: 'MYFutureJobs engineer 56' });
  await jobstreetAttempt.getByRole('button', { name: 'Yes, save' }).click();
  await dashboard.getByRole('button', { name: 'JobStreet engineer 52' }).waitFor();
  assert.equal((await send('exportPage')).find(record => record.externalJobId === '52').verificationStatus, 'user_confirmed');
  await otherAttempt.getByRole('button', { name: 'No', exact: true }).click();
  await otherAttempt.waitFor({ state: 'detached' });
  assert.equal((await send('exportPage')).some(record => record.externalJobId === '56'), false);
  await jobstreet.close();
  await parallel.close();
  console.log('JobStreet new-tab handoff and review navigation, MYFutureJobs confirmation and two-tab isolation passed.');

  const declined = await start('https://candidates.myfuturejobs.gov.my/job/53?retry=1');
  await declined.locator('#submit').click();
  await declined.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  await dashboard.reload();
  await dashboard.getByRole('button', { name: 'No', exact: true }).click();
  await eventually(() => send('pendingAttempts'), attempts => attempts.length === 0, 'Decline did not clear the pending attempt');
  assert.equal((await send('exportPage')).some(record => record.externalJobId === '53'), false);
  await declined.locator('#submit').click();
  await eventually(() => send('pendingAttempts'), attempts => attempts.length === 1, 'Retry after decline did not become pending');
  await dashboard.reload();
  await dashboard.getByRole('button', { name: 'No', exact: true }).click();
  await eventually(() => send('pendingAttempts'), attempts => attempts.length === 0, 'Retry decline did not clear the pending attempt');
  await declined.close();

  const failed = await start('https://candidates.myfuturejobs.gov.my/job/54?result=failure');
  await failed.locator('#submit').click();
  await failed.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  assert.deepEqual(await send('pendingAttempts'), []);
  assert.equal((await send('exportPage')).some(record => record.externalJobId === '54'), false);
  await failed.close();

  await dashboard.getByLabel('Auto-save after').selectOption('5');
  await dashboard.getByText('Settings saved.').waitFor();
  const timeout = await browser.newPage();
  await timeout.goto('https://my.jobstreet.com/job/55/apply/review?sol=fixture');
  await timeout.getByTestId('review-submit-application').click();
  await timeout.locator('job-application-tracker-notice').waitFor({ state: 'attached' });
  await timeout.close();

  const devtools = await browser.newCDPSession(dashboard);
  let extensionVersion;
  devtools.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
    extensionVersion = versions.find(version => version.scriptURL === worker.url()) ?? extensionVersion;
  });
  await devtools.send('ServiceWorker.enable');
  const running = await eventually(() => extensionVersion, version => version?.runningStatus === 'running', 'No running tracker worker found');
  await devtools.send('ServiceWorker.stopWorker', { versionId: running.versionId });
  await eventually(() => extensionVersion, version => version?.runningStatus === 'stopped', 'Tracker worker did not stop');
  await devtools.detach();

  // Read-only IndexedDB inspection avoids triggering the worker's message-based sweep.
  const readStored = () => dashboard.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('job-application-tracker');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const query = db.transaction('records').objectStore('records').getAll();
      query.onsuccess = () => { db.close(); resolve(query.result); };
      query.onerror = () => { db.close(); reject(query.error); };
    };
  }));
  await eventually(readStored, jobs => jobs.some(record => record.externalJobId === '55' && record.verificationStatus === 'unconfirmed'),
    'Closed-tab timeout did not persist an unconfirmed record', 38_000);
  await dashboard.reload();
  await dashboard.getByRole('button', { name: 'JobStreet engineer 55' }).waitFor();
  console.log('Decline, retry, explicit failure and alarm recovery after tab closure and worker stop passed.');

  async function exportFile(label) {
    const pending = dashboard.waitForEvent('download');
    await dashboard.getByRole('button', { name: label }).click();
    const file = await pending;
    const path = resolve(qa, file.suggestedFilename());
    await file.saveAs(path);
    return path;
  }

  const csv = await exportFile('Export CSV');
  assert.match(await readFile(csv, 'utf8'), /’=Fixture Engineer/);
  const xlsx = await exportFile('Export XLSX');
  assert.equal((await readFile(xlsx)).subarray(0, 2).toString(), 'PK');
  const backup = await exportFile('Back up JSON');
  assert.equal(JSON.parse(await readFile(backup, 'utf8')).records.length, 4);
  await dashboard.locator('input[type=file]').setInputFiles(backup);
  await dashboard.getByText('Added 0 and skipped 4 existing or duplicate records.').waitFor();
  console.log('CSV and XLSX downloads, JSON backup and duplicate-safe restore passed.');

  for (const width of [320, 768, 1024, 1440]) {
    await dashboard.setViewportSize({ width, height: 960 });
    assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Page overflow at ${width}px`);
    if (width === 320 || width === 1440) await dashboard.screenshot({ path: resolve(qa, `dashboard-${width}.png`), fullPage: true });
  }

  await dashboard.getByRole('button', { name: 'JobStreet engineer 55' }).focus();
  await dashboard.keyboard.press('Enter');
  await dashboard.getByRole('dialog').waitFor();
  await dashboard.keyboard.press('Escape');
  await dashboard.getByRole('dialog').waitFor({ state: 'detached' });
  dashboard.once('dialog', dialog => dialog.accept());
  await dashboard.getByRole('button', { name: 'Clear tracker data' }).click();
  await dashboard.getByText('Your log is empty').waitFor();
  assert.equal(await dashboard.getByLabel('Detect on LinkedIn').isChecked(), false);
  assert.equal(await dashboard.getByLabel('Detect on MauKerja').isChecked(), false);
  assert.deepEqual(errors, []);
  console.log('Responsive layout, keyboard dialog controls, confirmed deletion and console checks passed.');
} catch (error) {
  for (const page of browser.pages()) {
    console.error(page.url(), await page.locator('body').innerText({ timeout: 1000 }).catch(() => '').then(value => value.slice(0, 1200)));
  }
  for (const worker of browser.serviceWorkers()) console.error('Worker:', worker.url());
  throw error;
} finally {
  await browser.close();
}
