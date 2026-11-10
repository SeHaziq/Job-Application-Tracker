# Development roadmap

## Phase 0 — Environment preparation

Complete. The Windows PowerShell workspace started empty. Git 2.55.0 initialized a local repository. Node 26.2.0 and npm 12.2.1 are installed. The official Node release schedule lists Node 26 as LTS. The restricted shell could not resolve the npm registry, so registry operations used approved network access. The official WXT CLI created its React/TypeScript starter.

## Implementation plan

| Phase | Deliverable | Verification |
| --- | --- | --- |
| 1 | Chrome MV3 starter, strict TypeScript, lint, tests and build scripts | Prepare, typecheck, lint and build |
| 2 | Popup, dashboard entry, typed messages, settings and site recognition | Domain and settings tests |
| 3 | IndexedDB repository, manual recording, editing and duplicate handling | Fake IndexedDB integration tests |
| 4 | Structured data first, then dedicated DOM adapters and manual fallback | DOM fixtures and URL tests |
| 5 | Observe user-initiated flow, persist attempts and resolve atomically | State, failure and race tests |
| 6 | Isolated confirmation card with durable deadlines and recovery | Component tests and Chrome alarms review |
| 7 | Integrate the three site adapters with the shared flow | Multi-step fixtures and documented live checks |
| 8 | Dashboard statistics, filtering, details and record management | Component tests |
| 9 | CSV, XLSX and versioned JSON restore | Formula safety and round-trip tests |
| 10 | Settings, privacy controls and accessibility | Component and browser checks |
| 11 | Full checks, permission review and lifecycle QA | Tests, production build and Chrome smoke test |
| 12 | Icons, installable package and release documentation | Inspect built manifest and ZIP |

The worker owns IndexedDB writes. Pending attempts and finalized records share a transaction boundary. Chrome storage holds settings only. Dedicated content scripts read public listing and application-state DOM on supported hosts. Manual extraction uses the user's toolbar click on other sites. Site confirmation requires a fresh, scoped success signal tied to a final attempt. The release remains local for review.

## Phase reports

| Phase | Status | Implemented and technical decisions | Files | Verification and limits | Next |
| --- | --- | --- | --- | --- | --- |
| 1 — WXT starter | Complete | Official React template, MV3, strict TypeScript, locked compatible dependencies. TypeScript 6.0.3 fits the lint parser's supported range. | `package.json`, `package-lock.json`, `wxt.config.ts`, `tsconfig.json`, `eslint.config.mjs` | Typecheck, lint, development and production builds passed. Browser smoke test scheduled for phase 11. | Foundation |
| 2 — Foundation | Complete | React popup and dashboard, typed worker messages, host routing and local settings. | `entrypoints/`, `lib/platforms.ts`, `lib/messages.ts`, `lib/settings.ts` | 7 tests, typecheck, lint and production build passed. | Storage |
| 3 — Storage and manual records | Complete | Dexie schema v1, transactional identity checks, manual create/edit/delete, saved jobs separated from applications. | `lib/records.ts`, `lib/repository.ts`, `ui/JobForm.tsx`, `tests/repository.test.ts` | 12 tests passed including concurrent save and database reopen, plus typecheck, lint and build. | Extraction |
| 4 — Extraction | Complete for fixtures | JSON-LD first, one adapter per platform, activeTab fallback and prior-application lookup. | `lib/detectors/`, `lib/current-tab.ts`, `entrypoints/content.ts` | 18 tests, typecheck, lint and build passed. Live selectors require platform QA. | Submission engine |
| 5 — Submission engine | Complete for fixtures | Dexie v2 captures drafts and submits, scope-aware event recognition, atomic verification decisions. | `lib/attempts.ts`, `lib/repository.ts`, `lib/detectors/observe.ts` | 28 tests, typecheck, lint and build passed. | Confirmation UI |
| 6 — Confirmation UI | Complete | Isolated confirmation card, persistent deadline and alarms, pending recovery in dashboard. | `ui/notification*`, `ui/PendingAttempts.tsx`, `lib/deadlines.ts` | 32 tests, typecheck, lint and build passed. Chrome may deliver fallback alarms after the displayed deadline. | Platform fixtures |
| 7 — Platform integrations | Partially complete | Scoped selectors and multi-step fixtures for all three sites, manual fallback for redirects and unknown workflows. | `lib/detectors/`, `tests/flow.test.ts`, `PLATFORMS.md` | 34 tests, typecheck, lint and build passed. Authenticated live acceptance remains open. | Dashboard |
| 8 — Dashboard | Complete | Local statistics, paged table with filters and sort, editable details, verification, duplicate suggestions, stale-edit protection. | `entrypoints/dashboard/`, `ui/ApplicationTable.tsx`, `ui/RecordDialog.tsx`, `ui/base.css` | 37 tests, typecheck, lint and build passed. Browser layout and keyboard checks remain in phase 11. | Exports |
| 9 — Export and backup | Complete | Quoted CSV, typed XLSX cells with long-text continuation, validated versioned JSON restore. | `lib/export.ts`, `ui/ExportControls.tsx`, `tests/export.test.ts` | 41 tests, typecheck, lint and build passed. Final JSON backup and restore limit is 24 MiB. | Settings |
| 10 — Settings and privacy | Complete | Partial preference updates, per-site listener shutdown, confirmed data deletion and late verification of a timed-out attempt. | `ui/SettingsPanel.tsx`, `lib/settings.ts`, `lib/repository.ts` | 45 tests, typecheck, lint and build passed. | Hardening |
| 11 — Hardening | Complete locally | Independent review and fixes for stale confirmation, retries, URL credential redaction, generic identity, promotion edits, late failure, and bounded export transport. | `lib/detectors/observe.ts`, `lib/urls.ts`, `lib/repository.ts`, `scripts/smoke.mjs`, `tests/` | 53 tests, typecheck, lint, development and production builds, and Chrome for Testing smoke passed. Chrome exercised stale feedback, multiple tabs, worker stop and alarm recovery. Production audit found zero advisories. Development-only audit reported 9 moderate and 4 low entries, and Vite warned about one development chunk above 500 kB. | Local release |
| 12 — Release preparation | Complete locally | Version 0.1.0, extension icon set, release archive, installation and privacy documentation. | `assets/icon.svg`, `public/icon/`, `README.md`, `PRIVACY.md`, `RELEASE.md` | The 203,163-byte ZIP contains the expected MV3 worker, popup, dashboard, icons, and narrow host match patterns. | Live authenticated acceptance and any future store submission |

## 0.1.1 — Edge manual capture follow-up

The MYFutureJobs adapter now recognizes the public vacancy detail panel. Manual capture on a JobStreet application page uses the same vacancy's captured draft or its public listing. Strict TypeScript, lint, all 58 automated tests, the full Edge smoke suite, and the release ZIP inspection passed. Live capture passed on the reported MYFutureJobs vacancy. JobStreet's security check prevented live verification, so the application-form recovery was tested against a fixture.

## 0.1.2 — Edge toolbar popup

The user confirmed manual capture working in Edge. The updated popup puts the current site and save action first, uses a stable document width, and keeps the save controls visible when listing details are expanded. A regression check opens the native Edge toolbar popup and exercises capture into the save form. Live authenticated submission verification remains open.

## 0.1.3 — Reported submission controls

The user reported two missed automatic saves and shared the review and modal controls from Edge. This update matches those controls in their vacancy-specific routes. Edge fixtures exercise both final actions, the preliminary steps, and deadline recovery. The updated build still needs a live submission check on each site.

## 0.1.4 — JobStreet tab handoff

The user confirmed live MYFutureJobs submission tracking in Edge. The JobStreet miss was reproduced when Quick Apply opened a new tab and listing refetch returned 403. The fix transfers only a fresh draft for the same vacancy and browser session. Live JobStreet submission remains open.

## 0.1.5 — JobStreet confirmation recovery

The user shared the dedicated vacancy success route and sent-to-employer banner. The tracker now reconciles that confirmation independently of the review event, preserves an existing record or draft for the vacancy, and records a verified application even if the public listing is unavailable. The updated build needs a live JobStreet success-page check.

## 0.1.6 — Application log and toolbar polish

The user confirmed live JobStreet submission tracking in Edge. The log now displays captured or manually entered salary. The toolbar icon reflects site support, and notices show the seconds left until auto-save or dismissal.

## 0.1.7 — LinkedIn Easy Apply

LinkedIn search results track the selected vacancy through the native Easy Apply dialog. The tracker recognizes the final Submit application control and the sent-to-employer confirmation inside LinkedIn's open shadow DOM. Live LinkedIn acceptance remains open.

## 0.1.8 — LinkedIn listing autofill

The selected result's job link and nearby listing details supply the title, employer and location for manual capture and Easy Apply on the newer layout. Live capture remains to be checked.

## 0.1.9 — MauKerja

MauKerja listing capture uses the selected search modal. Mohon Segera creates a pending attempt for user confirmation. Live signed-in capture and submission remain to be checked.

## 0.1.10 — MauKerja application popup

Mohon captures a draft when opening the application popup. Hantar Sekarang starts confirmation tracking. The one-click Mohon Segera flow is covered by the same browser smoke test. Live signed-in verification remains open.

## 0.1.11 — MauKerja inline listing capture

Save current job reads the result card whose job ID matches the selected vacancy, including when MauKerja opens the details beside the search results. The Edge fixture includes two cards with the same job title and different employers. Live signed-in verification remains open.

## 0.1.12 — MauKerja direct card applications

Mohon on a search card binds the draft to the clicked card. Hantar Sekarang retains that vacancy even when the details pane shows a different job. A fresh success toast confirms the application. The new direct-card flow still needs signed-in verification.

## 0.1.13 — MauKerja English labels

The search card's apply state and button class distinguish application actions from progress. The English Apply Job, Apply Now, Submit Now, and success toast join the Malay flow. Live English submission still needs verification.

## 0.1.14 — Dashboard and project links

The dashboard charts weekly applications and current status from local records. The popup adds privacy and source links, and the dashboard links to the GitHub project and feedback page.

## 0.1.15 — Platform icons

The popup shows locally bundled icons for supported websites. The local storage settings refer to the browser profile.

GitHub Actions builds branch pushes and submits version tags from `main` to Microsoft Edge Add-ons. The first live workflow run still needs verification in GitHub and Partner Center.
