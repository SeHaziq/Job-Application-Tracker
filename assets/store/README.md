# Store assets

Marketing-only assets for the Chrome Web Store listing. They are not bundled with the extension and do not affect runtime behaviour.

The screenshots are HTML/CSS compositions that import the extension's real styles (`ui/base.css`, `entrypoints/dashboard/dashboard.css`, `entrypoints/popup/popup.css`, `ui/notification.css`) and mirror the current dashboard, popup, detection prompt, export panel, and privacy copy. Test records are fictional.

## Outputs

| File | Size | Use |
| --- | --- | --- |
| `screenshots/01-track-every-application.png` | 1280×800 | Application log overview |
| `screenshots/02-smart-application-detection.png` | 1280×800 | Supported-site detection prompt |
| `screenshots/03-job-search-dashboard.png` | 1280×800 | Summary, weekly activity, and status breakdown |
| `screenshots/04-csv-excel-json-export.png` | 1280×800 | CSV, XLSX, and JSON export |
| `screenshots/05-local-first-privacy.png` | 1280×800 | Local-first storage and privacy |
| `promo/small-promo-440x280.png` | 440×280 | Small promotional tile |
| `promo/marquee-1400x560.png` | 1400×560 | Marquee promotional tile |
| `brand/icon-128.png` | 128×128 | Store icon (96 px artwork, 16 px padding) |
| `brand/icon-512.png` | 512×512 | Brand/source icon |

The same generation also refreshes the manifest icons in `public/icon/` and `public/icon-muted/`.

## Regenerate

```powershell
npm.cmd run assets
```

Playwright tries the bundled Chromium first, then the installed Microsoft Edge, then Chrome. Set `JAT_ASSET_BROWSER=msedge` or `JAT_ASSET_BROWSER=chrome` to choose explicitly. The script fails if any PNG does not match its expected dimensions.

## Editing

- Copy and mockup markup: `assets/store/templates/promos.html`
- Composition, colours, and mockup scale: `assets/store/templates/promos.css`
- Logo sources: `assets/icon.svg` (full bleed) and `assets/icon-muted.svg` (toolbar muted)
- The mockups mirror the current UI. When the dashboard, popup, detection prompt, export panel, or privacy copy changes, update the templates and rerun `npm.cmd run assets`.

Keep the screenshots non-misleading: use only real functionality and accurate privacy claims. The store icon deliberately keeps 16 px of transparent padding; toolbar icons in `public/icon/` and `public/icon-muted/` are full bleed.
