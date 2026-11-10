# Architecture

## Extension boundaries

- `entrypoints/popup/` reads the active tab, displays indexed counts, and opens the shared manual form. A toolbar click grants temporary access for one structured capture on other sites.
- `entrypoints/dashboard/` handles application management, pending confirmations, exports, and settings. The dashboard fetches summaries on open or focus, displays up to 25 rows per page, and loads full descriptions when a record is opened.
- `entrypoints/content.ts` loads on exact HTTPS hosts, in the top frame. It installs the enabled detector and hosts the closed Shadow DOM notification. It reads listing markup, trusted button events, and relevant feedback. Form answers and uploaded files stay on the site.
- `entrypoints/background.ts` registers listeners synchronously and owns persistence. `lib/messages.ts` defines request and response types. The worker checks the sender extension, origin, top frame and allowed command. Site clients can access only their own attempt context. UI clients can manage the log.

## Storage and identity

Chrome local storage holds detection and countdown settings. Session storage holds a random browser-session identifier for tab ownership. Dexie owns the extension-origin IndexedDB schema.

| Version | Tables and indexes |
| --- | --- |
| 1 | Records by UUID. Unique normalized URL and platform plus external job ID. Status, verification, and applied date indexes. |
| 2 | Attempts by UUID, with context, stage, creation time, and deadline indexes. |
| 3 | Settled attempt metadata and index for short-lived idempotent resolution. |
| 4 | Unique platform identity for dedicated adapters. Generic listings keep their extracted ID as display data. The migration redacts known credential parameters and keeps records whose URLs converge. |

Records preserve the source URL with credential parameters removed and use a normalized copy for duplicate lookup. Dedicated platform ID takes priority, then normalized URL. Company and title are a dashboard hint because distinct vacancies can share both. JSON restore is additive and validates all rows before the transaction. Dashboard edits include the prior update timestamp to catch conflicts.

A Saved job has no application time or verification. Application timestamps are ISO UTC strings. The dashboard displays them in local time. Missing fields remain absent.

## Detection and notification

Each `SiteDetector` supplies listing extraction, workflow scope, final labels, and terminal feedback. The registry selects a detector by HTTPS host. Extraction prioritizes JobPosting metadata and fills gaps with adapter DOM fields. The generic fallback is user-triggered and structured-only.

1. A trusted Apply interaction captures a draft for the browser session, tab, and platform. Review and Next leave the draft unchanged.
2. A scoped final submit persists a pending attempt with the selected deadline. A short-lived observer checks for fresh, visible success or failure evidence tied to the listing.
3. Fresh success saves Site confirmed. Unresolved attempts offer Yes and No. Expiry saves as Unconfirmed. A fresh success can upgrade the record. An explicit failure can undo a timeout-owned write within the observation window if the record has not been edited.
4. The worker resolves the attempt and writes the record in one transaction. Repeated events return the prior outcome while its small metadata entry is retained. Finalized attempt metadata stores the decision and record reference, plus enough information to restore a saved draft after a late failure.
5. A page timer and an active worker timer provide prompt feedback. Chrome alarms and startup sweeps recover the persisted deadline if the page or worker goes away. Chrome can deliver a fallback alarm after the visible countdown. Off leaves the attempt available for manual review in the dashboard.

Same-site reloads can restore pending UI in the originating tab. Status text already visible when the observer resumes is baseline evidence and cannot verify the attempt. The dashboard can recover pending attempts after a browser restart. A clear-data action turns off site detection and removes records and attempts. Preferences other than site detection remain available.

JobStreet's vacancy-specific success route can verify a record from its visible sent-to-employer banner. The trusted content script sends its current path because same-document navigation can leave the worker's sender URL stale. The worker derives the site origin from the sender and the vacancy ID from the exact success path.

## Export

`lib/export.ts` prepares CSV, XLSX rows, and versioned JSON. The dashboard reads full records in bounded pages for export. Spreadsheet cells are text. CSV prefixes formula-shaped values with a visible typographic apostrophe. XLSX stores oversized text in ordered chunks on the Long text sheet. JSON preserves the full records and supports additive restore up to 24 MiB.
