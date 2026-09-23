#!/usr/bin/env node
/*
  Функциональные проверки итоговой страницы: полный обход Tab, видимость
  фокуса, якоря, FAQ, мобильное меню, неразрывная цена, движение.
  node qa/checks.mjs site/index.html
*/
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const input = resolve(process.argv[2] || 'site/index.html');
const url = pathToFileURL(input).href;
const browser = await chromium.launch({ headless: true });
const results = [];
const ok = (name, pass, detail) => results.push({ pass: !!pass, name, detail });

async function open(width, height, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...opts });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  return { ctx, page };
}

/* ── 1. Полный обход Tab + видимость фокуса (1440×900) ── */
{
  const { ctx, page } = await open(1440, 900);
  const seq = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const cur = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || '').trim().slice(0, 40).replace(/\s+/g, ' '),
        outlineWidth: s.outlineWidth,
        w: Math.round(r.width), h: Math.round(r.height),
      };
    });
    if (!cur) break;
    seq.push(cur);
  }
  ok('Tab доходит до всех интерактивных элементов', seq.length >= 15, `${seq.length} остановок`);
  const noOutline = seq.filter(s => parseFloat(s.outlineWidth) < 2);
  ok('Видимый фокус на каждой остановке (outline ≥ 2px)', noOutline.length === 0,
    noOutline.length ? noOutline.map(s => s.text).join(' | ') : 'все с outline 3px');
  const tooSmall = seq.filter(s => s.h < 24 || s.w < 24);
  ok('Область фокуса не схлопнута', tooSmall.length === 0, tooSmall.map(s => `${s.text}:${s.w}x${s.h}`).join(' | ') || '—');
  await ctx.close();
}

/* ── 2. Якоря реально прокручивают (1440×900) ── */
{
  const { ctx, page } = await open(1440, 900);
  for (const id of ['formats', 'process', 'faq']) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.click(`header a[href="#${id}"]`);
    await page.waitForTimeout(900);
    const d = await page.evaluate(id => {
      const t = document.getElementById(id).getBoundingClientRect().top;
      return { scrollY: Math.round(scrollY), topDelta: Math.round(t) };
    }, id);
    ok(`Якорь #${id} прокручивает к секции`, d.scrollY > 100 && Math.abs(d.topDelta) < 10, JSON.stringify(d));
  }
  await ctx.close();
}

/* ── 3. FAQ: каждый details открывается и закрывается ── */
{
  const { ctx, page } = await open(390, 844);
  const n = await page.locator('#faq details').count();
  let allOk = true;
  for (let i = 0; i < n; i++) {
    const d = page.locator('#faq details').nth(i);
    await d.locator('summary').click();
    const opened = await d.evaluate(e => e.open && e.querySelector('p').getBoundingClientRect().height > 0);
    await d.locator('summary').click();
    const closed = await d.evaluate(e => !e.open);
    if (!opened || !closed) allOk = false;
  }
  ok('Все FAQ открываются и закрываются', allOk && n === 5, `${n} вопросов`);
  await ctx.close();
}

/* ── 4. Мобильное меню (390×844 и 320×740) ── */
for (const [w, h] of [[390, 844], [320, 740]]) {
  const { ctx, page } = await open(w, h);
  const collapsed = !(await page.locator('#menu-list').isVisible());
  await page.click('.menu-toggle');
  await page.waitForTimeout(200);
  const opened = await page.evaluate(w => {
    const links = [...document.querySelectorAll('#menu-list a')];
    return {
      count: links.length,
      allInside: links.every(a => { const r = a.getBoundingClientRect(); return r.left >= -1 && r.right <= w + 1 && r.height >= 44; }),
      hasProcess: links.some(a => a.getAttribute('href') === '#process'),
      hasFaq: links.some(a => a.getAttribute('href') === '#faq'),
      expanded: document.querySelector('.site-menu').open,
    };
  }, w);
  ok(`${w}×${h}: меню свёрнуто по умолчанию`, collapsed === true, String(collapsed));
  ok(`${w}×${h}: в меню есть «Как проходит» и «Вопросы», ничего не обрезано`,
    opened.allInside && opened.hasProcess && opened.hasFaq && opened.count === 4, JSON.stringify(opened));
  // клик по ссылке закрывает меню
  await page.click('#menu-list a[href="#process"]');
  await page.waitForTimeout(700);
  const afterClick = await page.evaluate(() => ({
    hidden: !document.querySelector('.site-menu').open,
    scrolled: scrollY > 100,
  }));
  ok(`${w}×${h}: переход из меню закрывает его и прокручивает`, afterClick.hidden && afterClick.scrolled, JSON.stringify(afterClick));
  await ctx.close();
}

/* ── 5. Цена не разрывается ни на одном viewport ── */
for (const [w, h] of [[320, 740], [390, 844], [768, 1024], [1440, 900]]) {
  const { ctx, page } = await open(w, h);
  const r = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.nbr')) {
      const t = el.textContent.trim();
      if (!/[₽]/.test(t) && !/минут|недели/.test(t)) continue;
      out.push({ text: t, lines: el.getClientRects().length, w: Math.round(el.getBoundingClientRect().width) });
    }
    return out;
  });
  const broken = r.filter(x => x.lines !== 1);
  ok(`${w}×${h}: цена и длительность в одну строку`, broken.length === 0,
    broken.length ? JSON.stringify(broken) : r.map(x => x.text).join(' / '));
  await ctx.close();
}

/* ── 6. На телефоне CTA выше большого фото ── */
for (const [w, h] of [[320, 740], [390, 844], [768, 1024]]) {
  const { ctx, page } = await open(w, h);
  const r = await page.evaluate(() => {
    const cta = document.querySelector('[data-primary]').getBoundingClientRect();
    const img = document.querySelector('.hero-portrait').getBoundingClientRect();
    return { ctaBottom: Math.round(cta.bottom), imgTop: Math.round(img.top), ctaTop: Math.round(cta.top), vh: innerHeight };
  });
  ok(`${w}×${h}: CTA выше большого фото и в первом экране`,
    r.ctaBottom <= r.imgTop && r.ctaBottom < r.vh, JSON.stringify(r));
  await ctx.close();
}

/* ── 7. Движение: работает в обычном режиме, выключено при reduced-motion ── */
{
  const { ctx, page } = await open(1440, 900);
  const t0 = await page.evaluate(() => document.getAnimations().map(a => a.currentTime));
  await page.waitForTimeout(400);
  const t1 = await page.evaluate(() => document.getAnimations().map(a => a.currentTime));
  const marquee = await page.evaluate(() => {
    const el = document.querySelector('.marquee-track');
    const s = getComputedStyle(el);
    return { name: s.animationName, dur: s.animationDuration, state: s.animationPlayState };
  });
  ok('Есть реально идущая анимация (currentTime растёт)',
    t0.length > 0 && t0.some((v, i) => v !== t1[i]), `${t0.length} анимаций, marquee ${JSON.stringify(marquee)}`);
  await ctx.close();
}
{
  const { ctx, page } = await open(1440, 900, { reducedMotion: 'reduce' });
  const r = await page.evaluate(() => {
    const anims = document.getAnimations().length;
    const el = document.querySelector('.marquee-track');
    const s = getComputedStyle(el);
    const rev = [...document.querySelectorAll('.reveal')].map(x => getComputedStyle(x).opacity);
    return { anims, marqueeName: s.animationName, marqueeTransform: s.transform, hiddenReveals: rev.filter(o => Number(o) < 1).length };
  });
  ok('prefers-reduced-motion: анимаций нет', r.anims === 0 && r.marqueeName === 'none', JSON.stringify(r));
  ok('prefers-reduced-motion: весь контент видим', r.hiddenReveals === 0, `скрытых .reveal: ${r.hiddenReveals}`);
  await ctx.close();
}

/* ── 8. Без JS: контент и навигация доступны ── */
{
  const { ctx, page } = await open(390, 844, { javaScriptEnabled: false });
  const data = await page.$$eval('#menu-list a', els => els.map(a => {
    const rect = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), visible: rect.width > 0 && rect.height > 0 };
  }));
  const hiddenText = await page.$$eval('.reveal', els => els.filter(e => Number(getComputedStyle(e).opacity) < 1).length);
  const details = await page.$$eval('#faq details', els => els.length);
  ok('Без JS: все пункты навигации видимы', data.length === 4 && data.every(d => d.visible), JSON.stringify(data.map(d => d.href)));
  ok('Без JS: весь контент видим (.reveal не скрыт)', hiddenText === 0, `скрытых: ${hiddenText}`);
  ok('Без JS: FAQ остаётся нативным details', details === 5, `${details}`);
  // details работает без JS
  await page.locator('#faq details summary').first().click();
  const opened = await page.locator('#faq details').first().evaluate(e => e.open);
  ok('Без JS: FAQ раскрывается', opened === true, String(opened));
  await ctx.close();
}

/* ── 9. Нет горизонтального скролла ── */
for (const [w, h] of [[320, 740], [390, 844], [768, 1024], [1440, 900]]) {
  const { ctx, page } = await open(w, h);
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(`${w}×${h}: нет горизонтального скролла`, r.sw <= r.cw, JSON.stringify(r));
  await ctx.close();
}

await browser.close();

const failed = results.filter(r => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
process.exit(failed.length ? 1 : 0);
