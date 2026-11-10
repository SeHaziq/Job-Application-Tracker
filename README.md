# Job Application Tracker

**AI-Assisted Development · Local-First · Open Source**

A lightweight browser extension that helps you **save job listings, track applications, and manage your job search** — all in one place.

Job Application Tracker is designed to make job hunting more organized. It can recognize application activity on supported job platforms, help capture job details, and keep your records stored locally in your browser.

No separate account or external database required.

---

## Features

| Feature | Description |
|---|---|
| **Smart Application Detection** | Recognizes application submissions on supported job websites. |
| **Automatic Job Details** | Captures available job information, including position, company, and listing details. |
| **Submission Verification** | Distinguishes site-confirmed, user-confirmed, and unconfirmed submissions. |
| **Manual Job Tracking** | Save jobs and record applications from any website. |
| **JobStreet Form Assistance** | Helps populate supported application fields using information from the associated public job listing. |
| **Application Dashboard** | Search, filter, edit, and organize your job application history. |
| **Data Export & Backup** | Export to CSV or XLSX, and back up or restore using JSON. |
| **Local-First Storage** | Keeps your application records within your browser profile. |
| **Customizable Confirmation Timer** | Control how long the extension waits before recording an unresolved submission. |

### How submission detection works

The extension aims to distinguish three outcomes:

- **Site confirmed** — The job website provides a recognized successful submission confirmation.
- **User confirmed** — The extension cannot verify success, but you confirm that the application was submitted.
- **Unconfirmed** — The submission outcome remains uncertain.

By default, unresolved attempts are recorded as unconfirmed after a 10-second countdown. You can adjust or disable this behavior in Settings.

The extension does not automatically submit job applications on your behalf.

---

## Supported Job Platforms

Job Application Tracker currently includes integrations for:

| Platform | Integration |
|---|---|
| LinkedIn | Application detection and job detail capture |
| JobStreet | Application detection, job detail capture, and form assistance |
| MYFutureJobs | Application detection and job detail capture |
| Other websites | Manual job recording |

**More platforms are planned.**

Automated integrations have been tested against simulated pages using Chrome for Testing. Real authenticated application flows still require further verification.

See [Platform Coverage and Live Acceptance](PLATFORMS.md) for current limitations and testing progress.

### Request Support for a Job Website

Don't see your preferred job platform supported?

**You can request it!**

Open a GitHub Issue in this repository and include:

1. The name of the job website.
2. The website URL.
3. A brief explanation of its application process.
4. Optional screenshots showing the application flow.

Please do not include passwords, personal information, or sensitive application details.

Requests for additional job boards, regional recruitment platforms, and company career portals are welcome.

---

## Installation

### Option 1 — Install from a browser extension store

**Microsoft Edge Add-ons**

The extension has been submitted to the Microsoft Edge Add-ons store. A direct installation link will be added after publication.

**Google Chrome**

Chrome Web Store distribution is planned. Until then, you can install the unpacked extension manually.

### Option 2 — Install Manually

You can install the extension from a local build or an extracted release ZIP.

1. Download and extract the release ZIP, or build the project using the development instructions below.
2. Open your browser's extension management page:
   - Microsoft Edge: `edge://extensions`
   - Google Chrome: `chrome://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `.output/chrome-mv3` folder, or the extracted folder containing `manifest.json`.
6. Pin **Job Application Tracker** from the browser's Extensions menu.

If you already have job websites open, reload those tabs after installation.

---

## How to Use

### 1. Save a Job

While browsing a job listing:

1. Click the Job Application Tracker toolbar icon.
2. Select **Save current job**.
3. Review any automatically captured information.
4. Choose **Saved job** or **Applied**.

You can also manually enter job details when automatic extraction is unavailable.

### 2. Track an Application

On recognized LinkedIn, JobStreet, or MYFutureJobs application flows, the extension monitors the final submission process.

When a submission is detected:

- A recognized success message records the application as **Site confirmed**.
- If success cannot be verified, select **Yes, save** to record it as **User confirmed**.
- Select **No** to discard the detected attempt.
- If the confirmation countdown expires, the attempt is saved as **Unconfirmed**, unless the timer has been disabled.

You can review unresolved attempts and verify application records later.

### 3. Manage Your Applications

Open the extension dashboard to:

- Search and filter saved jobs.
- Review application statuses.
- Edit or update job records.
- Check unconfirmed submissions.
- Export application history as CSV or XLSX.
- Back up and restore records using JSON.

Your application records remain in your browser profile.

---

## Development

### Requirements

- Windows development environment (documented setup)
- Node.js 26 LTS
- npm
- Google Chrome 120 or newer, or a compatible Chromium browser
- Git
- VS Code or your preferred code editor

The release smoke tests use Playwright's bundled Chrome for Testing.

### Getting Started

Clone the repository and open the project directory.

Install dependencies:

```powershell
npm.cmd ci
```

Start the development environment:

```powershell
npm.cmd run dev
```

### Testing and Validation

Type checking:

```powershell
npm.cmd run typecheck
```

Linting:

```powershell
npm.cmd run lint
```

Run tests:

```powershell
npm.cmd test
```

### Build for Production

Build the extension:

```powershell
npm.cmd run build
```

Generate the distributable ZIP:

```powershell
npm.cmd run zip
```

Build output:

```text
.output/
├── chrome-mv3/
└── job-application-tracker-0.1.8-chrome.zip
```

The unpacked extension is available at `.output/chrome-mv3`.

---

## Contributing

**Contributions are welcome!**

Job Application Tracker is an evolving project, and community contributions can help improve compatibility, detection accuracy, usability, and browser support.

Whether you're fixing a bug, improving documentation, or adding support for another job application website, your help is appreciated.

### How to Contribute

1. Fork the repository.
2. Create a new branch for your changes.
3. Make and test your changes.
4. Run the project's type checks, linting, and tests.
5. Commit your changes with a clear description.
6. Open a **Pull Request** explaining what you've changed.

For larger features or new website integrations, consider opening an Issue first to discuss the proposed approach.

### Ways to Contribute

- Add support for more job platforms and company career websites.
- Improve application detection accuracy.
- Fix bugs and compatibility issues.
- Improve the extension's interface and usability.
- Expand automated tests.
- Improve documentation.
- Help with cross-browser support.

Please keep contributions focused, maintain existing functionality, and avoid introducing unnecessary dependencies.

---

## Bug Reports & Feature Requests

Found a bug or have an idea?

Open a **GitHub Issue** in this repository.

For bug reports, include the browser and extension version, steps to reproduce the issue, expected behavior, and actual behavior.

For feature requests, describe the problem you'd like to solve and how the proposed feature would help.

For website compatibility requests, include the job platform's name and URL.

Contributions and suggestions are welcome, but requested features and integrations are not guaranteed to be implemented.

---

## Privacy & Data

Job Application Tracker follows a **local-first design**.

Application records are stored in the user's browser profile. The extension does not require a separate account to manage saved applications.

The extension requests browser permissions needed for supported features, including page interaction and local data storage.

For more information, see [Privacy](PRIVACY.md).

---

## Documentation

| Document | Description |
|---|---|
| [Development](DEVELOPMENT.md) | Development environment, building, and testing |
| [Architecture](ARCHITECTURE.md) | Project structure and technical architecture |
| [Platform Coverage](PLATFORMS.md) | Supported job websites and integration limitations |
| [Privacy](PRIVACY.md) | Data handling and privacy information |
| [Roadmap](ROADMAP.md) | Planned features and future improvements |

---

## Project Status

**Current version:** `0.1.8`

Job Application Tracker is under active development.

The current focus is improving application detection reliability, validating supported website flows, and expanding compatibility with additional job platforms.

Some features may behave differently across websites depending on their layouts, authentication requirements, and application processes.

---

**Built with AI-assisted development and maintained with a focus on practical usability, privacy, and reliability.**

*Contributions, suggestions, and feedback are always appreciated.*
