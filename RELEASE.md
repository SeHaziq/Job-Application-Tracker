# Local release checklist

## 0.1.8

LinkedIn capture uses the selected vacancy link and nearby listing details to fill the title, company and location in manual capture and Easy Apply.

The local package is `.output/job-application-tracker-0.1.8-chrome.zip`. Its SHA-256 is `c63ca858226be2328d81292e49d44601465b150ec2f0c5695085b6172a943317`.

## 0.1.7

LinkedIn Easy Apply recognizes the native Submit application control and the sent-to-employer confirmation in the open shadow dialog. The tracker uses the selected vacancy ID from the search results URL.

The local package is `.output/job-application-tracker-0.1.7-chrome.zip`. Its SHA-256 is `cc6ddf50a7675e4aa328762782cc53d369dd4f99ef960881e17a04a90bd9197b`.

## 0.1.6

The Application log displays saved salary, the toolbar icon reflects site support, and submission notices show the time until auto-save or dismissal.

The local package is `.output/job-application-tracker-0.1.6-chrome.zip`. Its SHA-256 is `6165f657358aae0331ba71f7d99480808d18fc78a4f9d19ef8b0b49db8d545b7`.

## 0.1.5

JobStreet saves from the vacancy success page and the visible sent-to-employer banner, including when the review event was missed. The tracker uses the canonical listing link and enriches the title when the public listing is available.

The local package is `.output/job-application-tracker-0.1.5-chrome.zip`. Its SHA-256 is `5e485137423924d5930c98bf580e1be00353c8ed91405f51738bde78017b10de`.

## 0.1.4

JobStreet Quick Apply carries the listing draft across tabs by vacancy ID. The review control sends the submission event to the worker before the page can navigate.

The local package is `.output/job-application-tracker-0.1.4-chrome.zip`. Its SHA-256 is `5d5d52ba8c2b7b0548827f52ad17060bf16f971ac8bc68a13d18e81a23c171fa`.

## 0.1.3

Automatic detection recognizes the observed JobStreet review submit control and MYFutureJobs modal Apply control. JobStreet can recover listing details when the application opens directly. The local package is `.output/job-application-tracker-0.1.3-chrome.zip`. Its SHA-256 is `4ef0e14ffe928aad666bda7c322ba46b82873a3febfbaf310ef39afd72ae99c9`.

## 0.1.2

The toolbar popup uses a 368-pixel document width and a capture-first layout. The save form keeps its main fields and actions visible, with listing text and notes available in an expandable section.

The local package is `.output/job-application-tracker-0.1.2-chrome.zip`. Its SHA-256 is `ed9334a71cb0af0c5267087f2a20ff81f33de37cd740df030da7134be6fe580f`.

## 0.1.1

Manual capture now reads the MYFutureJobs vacancy detail panel and resolves JobStreet application-form URLs to their public listing. The local package is `.output/job-application-tracker-0.1.1-chrome.zip`. Its SHA-256 is `8c7b857fa60bca498871967ca871f05e54fccc3825033fc6fe2160bdbd8bd09f`.

Microsoft Edge 157 captured the reported public MYFutureJobs vacancy in a signed-out profile and passed the JobStreet application-route fixture. JobStreet required a security check for the live listing. The live JobStreet retry remains open.

## 0.1.0

Version 0.1.0 is the initial Chrome MV3 build. The ZIP can be extracted and loaded unpacked for review.

The local package is `.output/job-application-tracker-0.1.0-chrome.zip`. Its SHA-256 is `081e2ff0b9d4bdb930fe2d39a87f71e6dcd4da3d7dcdc718e504a77a121a71fe`.

- Build and inspect `manifest.json` for the version, service worker, action popup, icons, and narrow host patterns.
- Run strict TypeScript, ESLint, Vitest, the unpacked Chrome smoke test, and the production dependency audit.
- Review the extension disclosure and installation instructions in [PRIVACY.md](PRIVACY.md) and [README.md](README.md).
- Validate live authenticated workflows using [PLATFORMS.md](PLATFORMS.md) before advertising automatic support for them.
- For a future Chrome Web Store submission, host the privacy policy, prepare listing screenshots and accurate disclosure, and complete the developer dashboard forms. Review the current [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) and [2026 privacy and transparency update](https://developer.chrome.com/blog/cws-policy-updates-2026).
