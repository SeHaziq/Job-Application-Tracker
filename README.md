# Job Application Tracker

A local-first Chrome extension for saving jobs and tracking applications. It stores records in your Chrome profile and supports manual recording on any website.

## Install the unpacked build

1. Build with the commands below, or extract the local release ZIP.
2. Open `edge://extensions` in Microsoft Edge or `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked**, then select `.output/chrome-mv3` or the extracted folder containing `manifest.json`.
4. Pin **Job Application Tracker** from the Extensions menu. Reload any job tabs that were already open.

## Track a job

- Open the toolbar popup and choose **Save current job**. Review any captured fields, then choose **Saved job** or **Applied**.
- On a JobStreet application form, the tracker can fill details from the associated public listing. If details are unavailable, follow **Open the listing** in the manual form and try again.
- In recognized LinkedIn, JobStreet, and MYFutureJobs flows, the extension captures listing details and watches for a final submission. A recognized site confirmation saves as **Site confirmed**. When the outcome is unclear, **Yes, save** records **User confirmed**. **No** discards the attempt.
- The default 10-second countdown saves an unresolved attempt as **Unconfirmed**. Adjust the timer or turn it off in Settings. Review open attempts and verify records from the dashboard.
- Use the dashboard to search, filter, edit, and export the log. CSV and XLSX are spreadsheet exports. JSON is the backup and restore format.

The three platform integrations were exercised with simulated pages in Chrome for Testing. [Platform coverage and live acceptance](PLATFORMS.md) describes the authenticated flows still to verify. Manual recording is available for redirects, localized workflows, and sites with unsupported layouts.

## Develop on Windows

Use Node.js 26 LTS and npm. Chrome 120 or newer is required to load the extension. The release smoke test uses Playwright's bundled Chrome for Testing.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run zip
```

The unpacked build is `.output/chrome-mv3`. The ZIP is `.output/job-application-tracker-0.1.8-chrome.zip`. See [development and testing](DEVELOPMENT.md), [architecture](ARCHITECTURE.md), [privacy](PRIVACY.md), and the [roadmap](ROADMAP.md).
