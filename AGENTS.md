# Project instructions

- This is a Windows PowerShell WXT React extension targeting Chrome Manifest V3. Use `npm.cmd` for npm commands.
- `entrypoints/` contains the background, content script, popup, and dashboard. `lib/` holds typed messages, the repository, detection adapters, and export transforms. `ui/` contains shared presentation. `tests/` contains deterministic fixtures and `scripts/smoke.mjs` exercises the unpacked extension.
- Keep extension-origin database writes in the service worker. Preserve migrations and transactional attempt resolution. Keep temporary capture data separate from finalized records.
- Add new sites through the detector contract and exact-host registry. Treat click, native submit, success, failure, and dismissal as distinct events. Test observable evidence before claiming support.
- Preserve the local-only boundary. Avoid broad hosts, remote scripts, analytics, application form values, protected API calls, and automated application actions.
- Keep TypeScript strict and avoid unneeded dependencies and unrelated edits. Add regression tests for nontrivial changes and update the relevant docs and roadmap.
- Verify with `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build`. Run `npm.cmd run test:browser` for user flows and extension permissions after installing the project-local Playwright browser.
- Do not use authenticated accounts, submit real applications, publish, or push without explicit authorization. Document what remains to verify live.
