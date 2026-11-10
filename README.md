# Job Application Tracker

**AI-Assisted Development** · **Local-First** · **Manifest V3**

A lightweight browser extension to **save jobs, track applications, and organize your job search** — all in one place.

Automatically detects applications on supported platforms, with manual tracking available for any website. Your records stay in your browser profile.

## Features

<<<<<<< HEAD
- Open the toolbar popup and choose **Save current job**. Review any captured fields, then choose **Saved job** or **Applied**.
- On a JobStreet application form, the tracker can fill details from the associated public listing. If details are unavailable, follow **Open the listing** in the manual form and try again.
- In recognized LinkedIn, JobStreet, MYFutureJobs, and MauKerja flows, the extension captures listing details and watches for a final submission. A recognized site confirmation saves as **Site confirmed**. On MauKerja this includes **Permohonan berjaya dihantar!** after the user submits from the listing pane or a result card. If the result is unclear, **Yes, save** records **User confirmed**, **No** discards it, and the optional timer saves an unanswered attempt as **Unconfirmed**.
- The default 10-second countdown saves an unresolved attempt as **Unconfirmed**. Adjust the timer or turn it off in Settings. Review open attempts and verify records from the dashboard.
- Use the dashboard to search, filter, edit, and export the log. CSV and XLSX are spreadsheet exports. JSON is the backup and restore format.
=======
- **Smart Detection** — Detects application submissions on supported job platforms.
- **Job Tracking** — Save jobs, manage statuses, and review application history.
- **Submission Verification** — Site-confirmed, user-confirmed, or unconfirmed.
- **JobStreet Assistance** — Helps fill supported fields using public job listing details.
- **Dashboard** — Search, filter, edit, and manage saved applications.
- **Export & Backup** — CSV, XLSX, and JSON support.
- **Local-First** — No separate account or external database required.
>>>>>>> c58d54799847e69e516e20e1f867f5c54a744f36

## Supported Platforms

| Platform | Support |
|---|---|
| LinkedIn | Application detection |
| JobStreet | Detection + form assistance |
| MYFutureJobs | Application detection |
| Other websites | Manual tracking |

> Platform integrations have been tested with simulated pages. See [Platform Coverage](PLATFORMS.md) for live testing status and limitations.

## Installation

**Microsoft Edge / Google Chrome**

1. Download and extract the release ZIP, or build the project.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable **Developer mode** → **Load unpacked**.
4. Select `.output/edge-mv3` for the default Edge build or the extracted folder containing `manifest.json`.

Pin the extension to your toolbar and reload any existing job tabs.

## Development

**Requirements:** Node.js 26 LTS, npm, and Chrome 120+.

```powershell
npm.cmd ci
npm.cmd run dev

# Quality checks
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test

# Production build
npm.cmd run build
npm.cmd run zip
```

<<<<<<< HEAD
The unpacked build is `.output/chrome-mv3`. The ZIP is `.output/job-application-tracker-0.1.13-chrome.zip`. See [development and testing](DEVELOPMENT.md), [architecture](ARCHITECTURE.md), [privacy](PRIVACY.md), and the [roadmap](ROADMAP.md).
=======
**Output:** `.output/chrome-mv3` and `.output/job-application-tracker-0.1.8-chrome.zip`

## Contributing

**Contributions are welcome!**

- **Request a Website** — Open an Issue with the job platform name, URL, and application flow.
- **Report a Bug** — Describe the issue, browser version, and steps to reproduce.
- **Suggest a Feature** — Share ideas for improving the extension.
- **Submit a Pull Request** — Fork the repository, make your changes, run the tests, and open a PR.

Please open an Issue before working on major changes or new platform integrations. Never include personal application data or credentials in reports.

## Documentation

[Development](DEVELOPMENT.md) · [Architecture](ARCHITECTURE.md) · [Platforms](PLATFORMS.md) · [Privacy](PRIVACY.md) · [Roadmap](ROADMAP.md)

---

<small>**v0.1.8** · Built with AI-assisted development · Made for a simpler job search.</small>
>>>>>>> c58d54799847e69e516e20e1f867f5c54a744f36
