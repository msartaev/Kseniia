#!/usr/bin/env node
/*
  Снимки экрана на Playwright:
  — viewport-скрины основных размеров (320×740, 390×844, 768×1024, 1440×900)
  — режим без JS (390×844) и с prefers-reduced-motion (1440×900, 390×844)
  — открытое мобильное меню (320×740, 390×844) и раскрытый FAQ (390×844)
  — полные прокрученные страницы (1440×900, 390×844)

  Запуск:
  PLAYWRIGHT_BROWSERS_PATH=.../browser-cache \
    node qa/shots.mjs site/index.html renders
*/
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const input = resolve(process.argv[2] || 'site/index.html');
const outDir = resolve(process.argv[3] || 'renders');
await mkdir(outDir, { recursive: true });
const url = pathToFileURL(input).href;
const browser = await chromium.launch({ headless: true });

async function shot(name, width, height, opts = {}) {
  const { fullPage = false, openMenu = false, openFaq = false, reduceMotion = false, noJs = false } = opts;
  const contextOpts = { viewport: { width, height } };
  if (noJs) contextOpts.javaScriptEnabled = false;
  if (reduceMotion) contextOpts.reducedMotion = 'reduce';
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  if (fullPage) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += height) {
      await page.evaluate(v => scrollTo({ top: v, behavior: 'instant' }), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(800);
  }
  if (openMenu) { await page.click('.menu-toggle'); await page.waitForTimeout(200); }
  if (openFaq) { await page.locator('#faq details summary').first().click(); await page.waitForTimeout(1000); }
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage });
  await ctx.close();
  console.log(name);
}

/* viewport-скрины, обычный режим */
await shot('final-320x740', 320, 740);
await shot('final-390x844', 390, 844);
await shot('final-768x1024', 768, 1024);
await shot('final-1440x900', 1440, 900);

/* без JS */
await shot('final-390x844-nojs', 390, 844, { noJs: true });

/* prefers-reduced-motion */
await shot('final-1440x900-reduce', 1440, 900, { reduceMotion: true });
await shot('final-390x844-reduce', 390, 844, { reduceMotion: true });

/* полные прокрученные */
await shot('full-1440x900', 1440, 900, { fullPage: true });
await shot('full-390x844', 390, 844, { fullPage: true });

/* открытое мобильное меню и раскрытый FAQ */
await shot('menu-open-390x844', 390, 844, { openMenu: true });
await shot('menu-open-320x740', 320, 740, { openMenu: true });
await shot('faq-open-390x844', 390, 844, { openFaq: true });

await browser.close();
