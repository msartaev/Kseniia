import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [portable, zipSite] = process.argv.slice(2);
if (!portable || !zipSite) throw new Error('Pass isolated portable HTML and extracted ZIP site HTML paths');
const browser = await chromium.launch({ headless: true });
for (const [name, path, width, height] of [
  ['portable-390x844', portable, 390, 844],
  ['zip-1440x900', zipSite, 1440, 900],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const failed = [];
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('pageerror', error => failed.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failed.push(`console: ${message.text()}`); });
  await page.goto(pathToFileURL(resolve(path)).href);
  await page.locator('.me').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.me-photo img')?.naturalWidth > 0);
  await page.locator('.me-photo img').evaluate(img => img.decode());
  await page.locator('.me').screenshot({ path: `renders/${name}.png` });
  const result = await page.evaluate(() => ({
    heroLoaded: document.querySelector('.hero-portrait img')?.naturalWidth > 0,
    portraitLoaded: document.querySelector('.me-photo img')?.naturalWidth > 0,
    fontsLoaded: document.fonts.check('16px "Golos Text"') && document.fonts.check('16px "Lora"'),
    personalLink: document.querySelector('.me-link')?.getAttribute('href'),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  console.log(name, JSON.stringify({ ...result, failed }));
  if (!result.heroLoaded || !result.portraitLoaded || !result.fontsLoaded || result.overflow || failed.length) process.exitCode = 1;
  await page.close();
}
await browser.close();
