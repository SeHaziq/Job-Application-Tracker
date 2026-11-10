# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Inferred from the repository and brief.** People running an active job search across several job boards, working in a desktop browser and returning to the same log over days or weeks. They need to remember what they applied to, where they are in each process, and whether a submission was confirmed without maintaining a separate spreadsheet or account.

## Product Purpose

Job Application Tracker keeps a private log of jobs and applications in the browser. It reduces the effort of recording an application in two ways: a toolbar popup can capture the current listing, and supported job platforms can turn a user-initiated submission into a pending or confirmed record. Success is a log the user can trust before closing the browser, with no interruption to the application itself.

## Positioning

The product combines local-first storage with submission-aware capture on supported job platforms. Most trackers rely on manual entry or a remote account; this extension keeps the database in the browser profile, watches only exact supported hosts, and distinguishes a site confirmation, a user confirmation, and an unconfirmed attempt.

## Operating Context

- A toolbar popup is used on a listing or application page when the user wants to save or record the current job.
- The full dashboard is used later to search, filter, review, edit, export, restore, and clear records and preferences.
- Supported detection currently covers LinkedIn, JobStreet, MYFutureJobs, and MauKerja. Other websites use manual capture.
- The dashboard can show a pending-attempt confirmation when the site outcome is unclear.
- The project targets Chrome, Edge, and Firefox. The repository has exercised Chrome and Edge smoke flows; Firefox compatibility and store packaging remain to verify in a later phase.

## Capabilities and Constraints

- Popup: capture the active listing, review editable fields, save a job or application, and see four headline totals.
- Dashboard: local overview statistics, weekly activity, status distribution, searchable/filterable log, record details, manual add/edit/delete, pending confirmations, CSV/XLSX export, JSON backup/restore, and detection preferences.
- Storage: Dexie/IndexedDB in the extension origin; settings in browser storage. The service worker owns extension-origin database writes. Temporary attempts remain separate from finalized records.
- Detection: adapters must preserve the exact-host registry and treat click, native submit, success, failure, and dismissal as distinct events.
- Privacy: no account, analytics, remote scripts, application form values, or automated application actions. Records stay in the browser profile unless the user exports them.
- Preserve all existing data, migrations, workflows, and detection behavior while the interface changes.
- Do not advertise unsupported platforms or unverified live behavior.

## Brand Commitments

- Product name: **Job Application Tracker**.
- The brief pins a refined dark-green identity on neutral surfaces, with a modern, minimal productivity-app character.
- Avoid generic AI aesthetics, excessive gradients, decorative clutter, and unnecessary motion.
- The existing checklist-and-tick logo is the current product mark. Phase 2 may evolve it while keeping it recognizable at toolbar size.

## Evidence on Hand

- Runnable WXT/React extension with deterministic fixtures, unit/integration tests, and a Playwright smoke suite.
- Existing popup, dashboard, notification, and icon assets in this repository.
- No verified testimonials, install counts, ratings, or live cross-browser support evidence should be invented for promotional work.

## Product Principles

1. **Make the next action obvious.** Capture on the current page, review before saving, and keep the log one step away.
2. **Earn trust through evidence.** Show whether an application was site-confirmed, user-confirmed, or unconfirmed; never imply more certainty than the data supports.
3. **Keep the private boundary visible.** Local-first is part of the interface, not just a policy page.
4. **Prefer familiar product patterns.** Users are managing a task, not exploring a brand experience.
5. **Preserve the record.** Interface changes must not risk existing data, migrations, or recovery paths.

## Accessibility & Inclusion

- Keyboard-reachable controls, visible focus, labelled inputs, semantic dialogs, status announcements, and responsive layouts down to a 320 px viewport.
- Body text and controls must remain readable at compact popup dimensions.
