import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const url = pathToFileURL(resolve(process.argv[2] || 'site/index.html')).href;
const browser = await chromium.launch({ headless: true });
let failed = false;
for (const [width, height, mode] of [
  [320, 740, 'default'], [390, 844, 'default'],
  [768, 1024, 'default'], [1440, 900, 'default'],
  [390, 844, 'nojs'], [390, 844, 'reduce'],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    javaScriptEnabled: mode !== 'nojs',
    reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`page: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => errors.push(`resource: ${r.url()}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.locator('.me').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.me-photo img')?.naturalWidth > 0);
  await page.waitForTimeout(900);
  const metrics = await page.evaluate(() => {
    const portrait = document.querySelector('.me-photo img');
    const photo = portrait.getBoundingClientRect();
    const link = document.querySelector('.me-link');
    return {
      imageWidth: portrait.naturalWidth,
      imageHeight: portrait.naturalHeight,
      displayWidth: Math.round(photo.width),
      displayHeight: Math.round(photo.height),
      fit: getComputedStyle(portrait).objectFit,
      alt: portrait.alt,
      link: link.getAttribute('href'),
      linkVisible: link.getBoundingClientRect().width > 0,
      overflow: document.documentElement.scrollWidth > innerWidth,
      hiddenContent: [...document.querySelectorAll('.me .reveal')].filter(e =>
        Number(getComputedStyle(e).opacity) === 0 &&
        e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().bottom > 0
      ).length,
      animations: document.getAnimations().length,
    };
  });
  const good = metrics.imageWidth === 853 && metrics.imageHeight === 1280 &&
    metrics.displayWidth >= 280 && metrics.fit === 'cover' &&
    metrics.alt === 'Ксения Галанина' && metrics.linkVisible &&
    metrics.link === 'https://t.me/zozhno_vozmozhno' && !metrics.overflow &&
    !errors.length && metrics.hiddenContent === 0 &&
    (mode !== 'reduce' || metrics.animations === 0);
  console.log(JSON.stringify({ viewport: `${width}x${height}`, mode, pass: good, ...metrics, errors }));
  if (!good) failed = true;
  await context.close();
}
await browser.close();
if (failed) process.exitCode = 1;
