#!/usr/bin/env node
// Проверка, что половины бегущей строки посимвольно одинаковы
// и FAQ открываются/закрываются штатно.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const input = resolve(process.argv[2] || 'site/index.html');
const url = pathToFileURL(input).href;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(700);

const r = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.marquee-item')].map(e => e.textContent.trim());
  // Половины одинаковы, если число элементов чётное и первая половина == вторая.
  const n = items.length;
  const half = n / 2;
  const a = items.slice(0, half);
  const b = items.slice(half);
  const halvesEqual = JSON.stringify(a) === JSON.stringify(b);
  // FAQ
  const faq = [...document.querySelectorAll('details')].map(d => ({
    q: d.querySelector('summary').textContent.trim(),
    open: d.open,
  }));
  return { n, half, halvesEqual, aSample: a, bSample: b, faqCount: faq.length, faq };
});
console.log('marquee items:', r.n, 'half:', r.half, 'halvesEqual:', r.halvesEqual);
if (!r.halvesEqual) {
  console.log('A:', JSON.stringify(r.aSample, null, 2));
  console.log('B:', JSON.stringify(r.bSample, null, 2));
  process.exit(1);
}
console.log('FAQ count:', r.faqCount);
console.log('FAQ questions:');
for (const f of r.faq) console.log(' -', f.q);

// Проверим открытие/закрытие каждого
let allOk = true;
for (let i = 0; i < r.faqCount; i++) {
  const d = page.locator('details').nth(i);
  await d.locator('summary').click();
  const opened = await d.evaluate(e => e.open);
  await d.locator('summary').click();
  const closed = await d.evaluate(e => !e.open);
  if (!opened || !closed) { allOk = false; console.log('FAIL faq #' + i); }
}
console.log('FAQ toggle:', allOk ? 'OK' : 'FAIL');

await browser.close();
process.exit(r.halvesEqual && allOk ? 0 : 1);
