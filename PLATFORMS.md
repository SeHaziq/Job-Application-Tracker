# Platform integrations

The extension uses the job listing DOM and public JobPosting metadata. It supports manual records on any site and limits automatic observation to the hosts in `lib/platforms.ts`. Desktop English labels and fixtures are the current baseline. Authenticated DOM and real submissions require live acceptance testing.

| Platform | Listing capture | Flow recognized in fixtures | Manual fallback |
| --- | --- | --- | --- |
| LinkedIn | Job ID in a listing URL or `currentJobId` in search results, JSON-LD, public and signed-in listing selectors | Easy Apply opens the native dialog. Next and Review leave the log unchanged. The final Submit application starts tracking, and the fresh sent-to-employer message in the shadow dialog confirms it. | Employer redirects, localized or changed UI |
| JobStreet Malaysia | Listing job ID, JSON-LD, job-ad fields. Quick Apply can carry the draft into a new tab by vacancy ID. | Continue leaves the log unchanged. Review creates a pending attempt. The vacancy-specific `/apply/success` page with the sent-to-employer banner can recover a missed review event. | External employer pages, alternate hostnames or labels |
| MYFutureJobs | The `/search-jobs/description` vacancy panel, with structured data and older layout support | The first Apply opens the form. The observed modal Apply on `apply=true` creates a pending attempt. Fresh thank-you feedback can confirm it. | Portal routes and layouts outside fixture coverage |
| MauKerja | The selected search card or the card whose Apply button was clicked, the selected search modal, and structured metadata on individual job pages | The card's apply state excludes View Progress. Mohon, Apply Job, and Apply Now open a draft. Hantar Sekarang, Submit Now, and Mohon Segera start tracking. Fresh Malay and English success toasts confirm the attempt. | Layouts outside fixture coverage and outcomes without readable feedback |
| Other websites | JobPosting data after clicking Save current job, with editable fields | Manual only | Enter missing listing fields and choose Saved job or Applied |

The [LinkedIn application guide](https://www.linkedin.com/help/linkedin/answer/a512388) describes the desktop Easy Apply flow. The [MYFutureJobs jobseeker manual](https://www.myfuturejobs.gov.my/wp-content/uploads/2023/11/ENGLISH-JOBSEEKER-MANUAL.pdf) describes the separate listing and form Apply actions and shows the confirmation message. CSS selectors and variations are evaluated against local fixtures until a live session can verify them.

## Live acceptance checklist

For a missed JobStreet application whose original success page is still accessible, reload that page after updating. The tracker records the verified vacancy from the sent-to-employer banner. It keeps a previously recorded submission time when available and uses the confirmation observation time otherwise. If the title cannot be recovered from a draft or the public listing, the dashboard displays **Job title unavailable** and allows editing.

1. Load the unpacked build and open a listing on each platform. Compare the popup capture to the listing.
2. During a genuine user-initiated application, confirm that Apply, Continue, and Review leave the log unchanged.
3. After the genuine final submit, compare site confirmation, unresolved results, and errors against the dashboard verification badge.
4. Exercise No and Yes, timer expiry, a reload, tab closure, and two tabs on different vacancies.
5. For redirected or localized workflows, record the application manually and document any observed adapter gaps using sanitized markup.

## Adding an adapter

Add an adapter implementing `SiteDetector`, register its exact hosts in `platforms.ts`, add fixture cases for listing, preliminary actions, final submit, success, failure and cancellation, then validate the actual desktop workflow before making a support claim.
