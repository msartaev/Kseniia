const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const key = 'zozhno-metrics-consent-v1';
const tag = 'https://mc.yandex.ru/metrika/tag.js';
function visit(saved = null, missing = []) {
  const listeners = {};
  const classes = () => { const set = new Set(); return { contains: x => set.has(x), add: x => set.add(x), remove: x => set.delete(x) }; };
  const style = () => { const values = new Map(); return { getPropertyValue: x => values.get(x) || '', setProperty: (x, y) => values.set(x, y), removeProperty: x => values.delete(x) }; };
  let document;
  const nodes = Object.fromEntries(['stats-consent', 'stats-allow', 'stats-deny', 'stats-settings', 'stats-more', 'stats-consent-title', 'stats-current', 'stats-status', 'main'].map(id => [id, {
    hidden: ['stats-consent', 'stats-settings', 'stats-deny', 'stats-current'].includes(id),
    classList: classes(), attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getBoundingClientRect() { return { height: 230 }; },
    contains(node) { return node === this || node?.insideNotice === true; },
    focus(options) { document.activeElement = this; this.focusOptions = options; },
    addEventListener(type, fn) { listeners[`${id}:${type}`] = fn; }
  }]));
  for (const id of ['stats-allow', 'stats-deny', 'stats-more', 'stats-consent-title']) nodes[id].insideNotice = true;
  const requests = [], writes = [], store = new Map(saved === null ? [] : [[key, saved]]);
  let reloads = 0;
  document = {
    activeElement: null, body: { classList: classes(), style: style() },
    getElementById(id) { return missing.includes(id) ? null : nodes[id]; },
    createElement(name) { return { name }; },
    head: { appendChild(node) { requests.push(node.src); } }
  };
  const window = {
    innerWidth: 390,
    localStorage: { getItem(k) { return store.get(k) ?? null; }, setItem(k, v) { store.set(k, v); writes.push([k, v]); } },
    location: { reload() { reloads++; } },
    addEventListener(type, fn) { listeners[`window:${type}`] = fn; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/metrics.js'), 'utf8'), { window, document, Date });
  return { nodes, requests, writes, store, window, document,
    click(id) { document.activeElement = nodes[id]; listeners[`${id}:click`](); },
    resize() { listeners['window:resize'](); },
    get reloads() { return reloads; } };
}

test('first visit keeps one OK action visible without loading analytics; reload repeats it', () => {
  const page = visit();
  assert.equal(page.nodes['stats-consent'].hidden, false);
  assert.equal(page.nodes['stats-allow'].hidden, false);
  assert.equal(page.nodes['stats-deny'].hidden, true);
  assert.equal(page.nodes['stats-settings'].attributes['aria-expanded'], 'true');
  assert.deepEqual(page.writes, []);
  assert.deepEqual(page.requests, []);
  page.click('stats-settings');
  assert.equal(page.document.activeElement, page.nodes['stats-consent-title']);
  assert.equal(page.nodes['stats-consent'].classList.contains('is-floating'), false);
  assert.equal(visit().nodes['stats-consent'].hidden, false);
});
test('OK stores yes, loads tag once, hides notice and moves focus', () => {
  const page = visit();
  page.click('stats-allow');
  assert.deepEqual(page.writes, [[key, 'yes']]);
  assert.deepEqual(page.requests, [tag]);
  assert.equal(page.nodes['stats-consent'].hidden, true);
  assert.equal(page.nodes['stats-settings'].attributes['aria-expanded'], 'false');
  assert.equal(page.document.activeElement, page.nodes.main);
  assert.equal(page.nodes.main.focusOptions.preventScroll, true);
  assert.match(page.nodes['stats-status'].textContent, /Метрика включена/);
  assert.equal(page.window.ym.a[0][1], 'init');
  assert.equal(page.window.ym.a[0][2].webvisor, false);
  assert.deepEqual(visit('yes').requests, [tag]);
});
test('saved yes offers only disable; it stores no and reloads to stop analytics', () => {
  const page = visit('yes');
  page.click('stats-settings');
  assert.equal(page.nodes['stats-consent-title'], page.document.activeElement);
  assert.equal(page.nodes['stats-current'].textContent, 'Сейчас Метрика включена.');
  assert.equal(page.nodes['stats-allow'].hidden, true);
  assert.equal(page.nodes['stats-deny'].hidden, false);
  page.click('stats-deny');
  assert.deepEqual(page.writes, [[key, 'no']]);
  assert.equal(page.reloads, 1);
  assert.deepEqual(visit('no').requests, []);
});
test('saved no offers only OK and can enable analytics', () => {
  const page = visit('no');
  assert.equal(page.nodes['stats-consent'].hidden, true);
  page.click('stats-settings');
  assert.equal(page.nodes['stats-current'].textContent, 'Сейчас Метрика выключена.');
  assert.equal(page.nodes['stats-allow'].hidden, false);
  assert.equal(page.nodes['stats-deny'].hidden, true);
  assert.equal(page.nodes['stats-consent'].classList.contains('is-floating'), true);
  assert.equal(page.document.body.style.getPropertyValue('--stats-space'), '262px');
  page.resize();
  assert.equal(page.document.body.style.getPropertyValue('--stats-space'), '262px');
  page.click('stats-allow');
  assert.deepEqual(page.requests, [tag]);
  assert.deepEqual(page.writes, [[key, 'yes']]);
  assert.equal(page.document.activeElement, page.nodes['stats-settings']);
  assert.equal(page.document.body.classList.contains('stats-space'), false);
});
test('second settings click closes panel without changing choice', () => {
  for (const choice of ['yes', 'no']) {
    const page = visit(choice);
    page.click('stats-settings');
    assert.equal(page.nodes['stats-settings'].attributes['aria-expanded'], 'true');
    page.click('stats-settings');
    assert.equal(page.nodes['stats-consent'].hidden, true);
    assert.equal(page.nodes['stats-consent'].classList.contains('is-floating'), false);
    assert.equal(page.document.body.classList.contains('stats-space'), false);
    assert.equal(page.document.body.style.getPropertyValue('--stats-space'), '');
    assert.equal(page.nodes['stats-settings'].attributes['aria-expanded'], 'false');
    assert.equal(page.document.activeElement, page.nodes['stats-settings']);
    assert.deepEqual(page.writes, []);
  }
});
test('desktop details leave room to read footer', () => {
  const page = visit();
  page.window.innerWidth = 1440;
  page.click('stats-more');
  assert.equal(page.document.body.style.getPropertyValue('--stats-space'), '262px');
  assert.deepEqual(page.requests, []);
});
test('missing optional nodes are safe', () => {
  const page = visit(null, ['stats-current', 'stats-status', 'stats-more', 'stats-consent-title']);
  page.click('stats-allow');
  assert.deepEqual(page.requests, [tag]);
  assert.deepEqual(visit(null, ['stats-allow']).requests, []);
});
test('HTML has exact text, one visible button and no close action', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const banner = html.match(/<section class="stats-banner"[\s\S]*?<\/section>/)[0];
  assert.match(banner, /id="stats-allow"[^>]*>ОК<\/button>/);
  assert.match(banner, /id="stats-deny"[^>]*hidden>Выключить Метрику<\/button>/);
  assert.equal([...banner.matchAll(/<button\b(?![^>]*\bhidden\b)/g)].length, 1);
  assert.doesNotMatch(banner, /id="stats-close"|Разрешить|Отказаться/);
  assert.match(banner, /Посещения сайта я считаю через Яндекс Метрику, она сохраняет cookie\. Метрика включится, только если вы нажмёте «ОК»\./);
  assert.match(html, /id="stats-status" role="status"/);
  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.match(html, /aria-controls="stats-consent" aria-expanded="false"/);
});
