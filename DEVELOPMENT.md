# Development on Windows

Use PowerShell, Git, Node.js 26 LTS, and npm. The package lock records compatible stable versions of WXT, Vite, React, TypeScript, and Vitest. The initial build was verified with Node 26.2.0 and npm 12.2.1. Use `npm.cmd` if PowerShell's script policy blocks `npm.ps1`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm.cmd ci` | Install from the lockfile and generate WXT types |
| `npm.cmd run dev` | Start WXT development mode |
| `npm.cmd run build:dev` | Build an unpacked development extension |
| `npm.cmd run typecheck` | Check strict TypeScript |
| `npm.cmd run lint` | Check source and test code |
| `npm.cmd test` | Run unit, DOM, component, and IndexedDB integration tests |
| `npm.cmd run build` | Build the production Edge MV3 extension in `.output/edge-mv3` |
| `npm.cmd run zip` | Produce the Edge release ZIP with the `-edge.zip` suffix |
| `npm.cmd run zip -- -b chrome --mv3` | Produce a separate Chrome release ZIP |
| `npm.cmd run zip -- -b firefox --mv3` | Produce the Firefox package and a source ZIP for Mozilla review |

Run `npm.cmd exec -- wxt prepare` after adding entry points if generated path types are stale. Build output and browser QA artifacts live under `.output/`.

## Browser checks

Use the project-local Playwright browser so the smoke test can sideload the extension into a temporary profile.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '0'
npm.cmd exec -- playwright install chromium
npm.cmd run build -- -b chrome --mv3
npm.cmd run test:browser
```

The browser test intercepts the three job hostnames with local HTML and uses only synthetic job records. It writes fixture exports and desktop/mobile dashboard screenshots to `.output/qa`. For live platform verification, use the procedure in [PLATFORMS.md](PLATFORMS.md).

Run `npm.cmd run build` and set `$env:JAT_SMOKE_EDGE = '1'` before `npm.cmd run test:browser` to use an installed Microsoft Edge in a disposable profile. This path uses the browser's DevTools extension-loading command.

To test the Firefox build, open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, and choose `.output/firefox-mv3/manifest.json`. Firefox 147 or later is required for same-tab navigation detection. Submit the built Firefox ZIP and its separate source ZIP to Mozilla Add-ons when ready for review.

The Firefox production build disables Zod's dynamic validation compiler and React DOM's raw HTML rendering path. Review the build transforms in `wxt.config.ts` when upgrading either dependency.

## Debugging

- To inspect the background worker, open `chrome://extensions`, enable Developer mode, then follow the service worker link under the tracker.
- Inspect popup or dashboard errors using that page's DevTools. Content-script logs appear in the relevant job tab.
- Reload the extension and then the job tab after changing content scripts.
- When Chrome cannot inject on a restricted tab, open the manual form and fill the fields yourself.
- When npm cannot resolve the registry in a managed environment, use the environment's approved package-access route. Avoid changing the global npm registry configuration.
