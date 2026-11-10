import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const template = resolve(root, 'assets/store/templates/promos.html');
const outputs = resolve(root, 'assets/store');

async function launchBrowser() {
  const channels = [process.env.JAT_ASSET_BROWSER, undefined, 'msedge', 'chrome'].filter(
    (channel, index, all) => channel !== null && all.indexOf(channel) === index,
  );
  let lastError;
  for (const channel of channels) {
    try {
      return await chromium.launch(channel ? { channel } : {});
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function pngSize(path) {
  const bytes = await readFile(path);
  if (bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function expectSize(path, width, height) {
  const actual = await pngSize(path);
  if (actual.width !== width || actual.height !== height) {
    throw new Error(`${path}: expected ${width}x${height}, got ${actual.width}x${actual.height}`);
  }
}

const iconSvg = await readFile(resolve(root, 'assets/icon.svg'), 'utf8');
const mutedSvg = await readFile(resolve(root, 'assets/icon-muted.svg'), 'utf8');
const dataUri = svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(template).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const slides = await page.locator('[data-out]').evaluateAll(nodes => nodes.map(node => ({
  id: node.id,
  out: node.dataset.out,
  width: node.getBoundingClientRect().width,
  height: node.getBoundingClientRect().height,
})));

for (const slide of slides) {
  const path = resolve(outputs, slide.out);
  await mkdir(dirname(path), { recursive: true });
  await page.locator(`#${slide.id}`).screenshot({ path, animations: 'disabled' });
  await expectSize(path, Math.round(slide.width), Math.round(slide.height));
  console.log(`${slide.out}  ${Math.round(slide.width)}x${Math.round(slide.height)}`);
}

async function renderIcon(svg, size, path, artwork = size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><style>
    html, body { margin: 0; width: 100%; height: 100%; background: transparent; }
    body { display: grid; place-items: center; }
    img { display: block; width: ${artwork}px; height: ${artwork}px; }
  </style><img src="${dataUri(svg)}" alt="">`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, omitBackground: true, animations: 'disabled' });
  await expectSize(path, size, size);
}

const icons = [
  [iconSvg, 16, 'public/icon/16.png'],
  [iconSvg, 32, 'public/icon/32.png'],
  [iconSvg, 48, 'public/icon/48.png'],
  [iconSvg, 96, 'public/icon/96.png'],
  [mutedSvg, 16, 'public/icon-muted/16.png'],
  [mutedSvg, 32, 'public/icon-muted/32.png'],
  [mutedSvg, 48, 'public/icon-muted/48.png'],
  [iconSvg, 512, 'assets/store/brand/icon-512.png'],
];
for (const [svg, size, relative] of icons) {
  await renderIcon(svg, size, resolve(root, relative));
  console.log(`${relative}  ${size}x${size}`);
}

// Chrome Web Store icons use 96 px artwork with 16 px transparent padding.
const storeIcon = resolve(root, 'public/icon/128.png');
await renderIcon(iconSvg, 128, storeIcon, 96);
await mkdir(resolve(outputs, 'brand'), { recursive: true });
await writeFile(resolve(outputs, 'brand/icon-128.png'), await readFile(storeIcon));
console.log('public/icon/128.png  128x128 (96 px artwork + 16 px padding)');
console.log('assets/store/brand/icon-128.png  128x128 (copy)');

await browser.close();
