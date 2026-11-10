# Privacy

Job Application Tracker stores your job records, job descriptions, application outcomes, and notes locally in your browser profile. It uses these details to capture jobs, track application status, and support backup and export.

On enabled job platforms the tracker reads the listing and visible application feedback. On other sites it looks for structured job posting data when you click **Save current job**. It strips recognized credential parameters from saved links. The extension does not read form answers, passwords, or resume contents. It does not upload files, submit applications, send analytics, or share application records. A file is created when you choose to export or back up the log.

When you open a JobStreet application form with automatic detection enabled or click **Save current job** there, the tracker may request the corresponding public listing from the same site to fill missing fields. It uses the browser's normal access to that site and saves the public listing link.

JobStreet drafts can move between tabs for the same vacancy in the same browser session. A draft remains eligible for this handoff for up to one hour after capture, even if you close the listing tab.

On a JobStreet vacancy success page, the tracker uses the vacancy ID and the visible confirmation banner to record the application. It can reuse a recent local draft for the same vacancy, including after an extension reload. When the title is missing, it may read the corresponding public listing from JobStreet.

## Permissions

| Permission | Use |
| --- | --- |
| `activeTab` | Read the active tab after the toolbar action |
| `scripting` | Run one structured-job capture after a manual request |
| `storage` | Store settings and distinguish tab ownership across browser sessions |
| `alarms` | Recover a pending countdown after the service worker stops |
| Exact LinkedIn, JobStreet, MYFutureJobs, and MauKerja HTTPS hosts | Recognize supported listings and application events in those tabs |

Use Settings to turn off detection for a website. **Clear tracker data** deletes saved records and pending attempts and turns off site detection. Keep any exports you want to retain. Exports are ordinary local files that remain under your control.
