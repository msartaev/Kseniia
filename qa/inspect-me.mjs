import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch({ headless: true });
for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.goto(pathToFileURL(resolve('site/index.html')).href);
  await page.locator('.me').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.me-photo img')?.naturalWidth > 0);
  await page.locator('.me-photo img').evaluate(img => img.decode());
  await page.locator('.me').screenshot({ path: `renders/me-${width}x${height}.png` });
  const metrics = await page.evaluate(() => {
    const section = document.querySelector('.me');
    const link = section.querySelector('.me-link');
    return {
      sectionHeight: Math.round(section.getBoundingClientRect().height),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      linkAbsent: link === null,
      portraitLoaded: document.querySelector('.me-photo img').naturalWidth > 0,
    };
  });
  console.log(`${width}x${height}`, metrics);
  if (!metrics.linkAbsent) process.exitCode = 1;
  await page.close();
}
await browser.close();
