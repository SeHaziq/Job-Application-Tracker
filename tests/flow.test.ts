// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { classifyButton, readSignals } from '../lib/detectors/flow';
import { detectors, extractJob } from '../lib/detectors';
import { readJobstreetSuccessCompany } from '../lib/detectors/jobstreet';

function fixture(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

it('separates LinkedIn Easy Apply, review, and final submission', () => {
  const doc = fixture(`<button id="start">Easy Apply</button>
    <div role="dialog" class="jobs-easy-apply-modal">
      <button id="review">Review</button>
      <button id="submit">Submit application</button>
    </div>
    <button id="unscoped">Submit application</button>`);
  const detector = detectors.linkedin;
  const url = new URL('https://www.linkedin.com/jobs/view/42/');
  const classify = (id: string) => classifyButton(detector, doc.querySelector('#' + id)!, url);
  expect(classify('start')).toBe('start');
  expect(classify('review')).toBeNull();
  expect(classify('submit')).toBe('submit');
  expect(classify('unscoped')).toBeNull();
});

it('tracks only the selected vacancy through the native LinkedIn Easy Apply dialog', () => {
  const doc = fixture(`<h1 class="job-details-jobs-unified-top-card__job-title">Data Analyst</h1>
    <a id="external" href="https://example.test/">Apply</a><button id="save">Save</button>
    <button id="start">Easy Apply</button><dialog open><h2>Apply to Northwind</h2><footer>
    <button id="next">Next</button><button id="review">Review</button>
    <button type="button"><span id="final">Submit application</span></button></footer></dialog>`);
  const url = new URL('https://www.linkedin.com/jobs/search-results/?currentJobId=4484147995&trackingId=fixture');
  const classify = (id: string) => classifyButton(detectors.linkedin, doc.querySelector(`#${id}`)!, url);
  expect(extractJob(doc, url.href)).toMatchObject({ externalJobId: '4484147995', jobTitle: 'Data Analyst' });
  expect(classify('start')).toBe('start');
  for (const id of ['external', 'save', 'next', 'review']) expect(classify(id)).toBeNull();
  expect(classify('final')).toBe('submit');
});

it('reads the LinkedIn sent-to-employer heading in the open shadow dialog only while visible', () => {
  const doc = fixture('<main><h3>Your application was sent to Northwind!</h3><div id="host"></div></main>');
  const shadow = doc.querySelector('#host')!.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<div aria-hidden="true"><div role="dialog" aria-labelledby="post-apply-modal">
    <h3 class="jpac-modal-header">Your application was sent to Northwind!</h3></div></div>`;
  expect(readSignals(detectors.linkedin, doc).size).toBe(0);
  shadow.firstElementChild!.setAttribute('aria-hidden', 'false');
  expect([...readSignals(detectors.linkedin, doc).values()]).toEqual(['site']);
  doc.querySelector('#host')!.setAttribute('hidden', '');
  expect(readSignals(detectors.linkedin, doc).size).toBe(0);
});

it('recognizes MYFutureJobs Apply as final only inside a job application form', () => {
  const doc = fixture(`<button id="start">Apply</button><div role="dialog"><h2>Apply for Engineer at Northwind</h2>
    <form><button id="submit">Apply</button></form></div>`);
  const url = new URL('https://candidates.myfuturejobs.gov.my/job/12');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('#start')!, url)).toBe('start');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('#submit')!, url)).toBe('submit');
});

it('ignores success copy outside recognized feedback surfaces', () => {
  const doc = fixture(`<main><p>Application sent</p>
    <div role="dialog" hidden><h2>Application sent</h2></div>
    <div role="status">Application sent</div>
  </main>`);
  expect([...readSignals(detectors.linkedin, doc).values()]).toEqual(['site']);
});

it('recognizes explicit application failure without treating generic field errors as failures', () => {
  const doc = fixture(`<div role="alert">Email is required</div><div role="alert">Your application could not be submitted.</div>`);
  expect([...readSignals(detectors.jobstreet, doc).values()]).toEqual(['fail']);
});

it('keeps JobStreet Next and Review outside final submission', () => {
  const doc = fixture(`<main><form data-automation="job-application-form"><input required>
    <button id="next">Next</button><button id="review">Review application</button>
    <button id="submit">Submit application</button></form></main>`);
  const url = new URL('https://my.jobstreet.com/apply/42');
  const classify = (id: string) => classifyButton(detectors.jobstreet, doc.querySelector('#' + id)!, url);
  expect(classify('next')).toBeNull();
  expect(classify('review')).toBeNull();
  expect(classify('submit')).toBeNull();
  doc.querySelector('input')!.value = 'fixture';
  expect(classify('submit')).toBe('submit');
});

it('recognizes JobStreet final submit on the vacancy apply route without an automation marker', () => {
  const doc = fixture(`<main><button id="next">Continue</button>
    <button id="submit">Submit application</button></main>`);
  const url = new URL('https://my.jobstreet.com/job/42/apply?sol=fixture');
  expect(classifyButton(detectors.jobstreet, doc.querySelector('#next')!, url)).toBeNull();
  expect(classifyButton(detectors.jobstreet, doc.querySelector('#submit')!, url)).toBe('submit');
  expect(classifyButton(detectors.jobstreet, doc.querySelector('#submit')!, new URL('https://my.jobstreet.com/job/42'))).toBeNull();
});

it('matches the JobStreet review button from the reported Edge markup only on the review route', () => {
  const doc = fixture('<div><button type="submit" data-testid="review-submit-application"><span>Submit application</span></button></div>');
  const control = doc.querySelector('span')!;
  const origin = 'https://my.jobstreet.com/job/95692492';
  expect(classifyButton(detectors.jobstreet, control, new URL(origin + '/apply/review?sol=fixture'))).toBe('submit');
  expect(classifyButton(detectors.jobstreet, control, new URL(origin))).toBeNull();
});

it('separates the MYFutureJobs listing Apply from the modal accept control in the reported markup', () => {
  const doc = fixture(`<button id="open">Apply</button><div>
    <swipe-button data-test="swipe-applyModal-button--accept"><button type="button"><span>Apply</span></button></swipe-button>
    <swipe-button data-test="swipe-applyModal-button--editProfile"><button>Edit Profile</button></swipe-button>
  </div>`);
  const listing = 'https://candidates.myfuturejobs.gov.my/search-jobs/description?jobId=42';
  const modal = new URL(listing + '&apply=true');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('#open')!, new URL(listing))).toBe('start');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('span')!, modal)).toBe('submit');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('#open')!, modal)).not.toBe('submit');
  expect(classifyButton(detectors.myfuturejobs, doc.querySelector('swipe-button:last-child button')!, modal)).toBeNull();
});

it('recognizes the MYFutureJobs confirmation heading on a full page', () => {
  const doc = fixture('<main><h1>Thank you for your application!</h1></main>');
  expect([...readSignals(detectors.myfuturejobs, doc).values()]).toEqual(['site']);
});

it('does not observe job confirmation feedback on unrelated pages', () => {
  expect(detectors.linkedin.observes(new URL('https://www.linkedin.com/messaging/'))).toBe(false);
  expect(detectors.jobstreet.observes(new URL('https://my.jobstreet.com/account/'))).toBe(false);
  expect(detectors.myfuturejobs.observes(new URL('https://www.myfuturejobs.gov.my/news/'))).toBe(false);
});

it('reads the JobStreet confirmation banner only on the vacancy success route', () => {
  const doc = fixture(`<main><h1>Keep it up, applicant</h1>
    <p>Your application has been sent to <span>Northwind Industries</span></p>
    <h2>You might also like</h2><h3>Unrelated recommended job</h3></main>`);
  const success = new URL('https://my.jobstreet.com/job/95466821/apply/success?sol=fixture');
  expect(readJobstreetSuccessCompany(doc, success)).toBe('Northwind Industries');
  expect(readJobstreetSuccessCompany(doc, new URL('https://my.jobstreet.com/job/95466821/apply/review'))).toBeUndefined();
  expect(readJobstreetSuccessCompany(fixture('<main><h1>Sign in</h1></main>'), success)).toBeUndefined();
});
