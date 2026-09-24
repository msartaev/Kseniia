const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
function visit(savedChoice = null) {
  const listeners = {};
  const nodes = Object.fromEntries(['stats-consent', 'stats-allow', 'stats-deny', 'stats-settings'].map(id => [id, {
    hidden: id === 'stats-consent' || id === 'stats-settings',
    focus() {},
    addEventListener(type, cb) { listeners[`${id}:${type}`] = cb; }
  }]));
  const requests = [];
  const writes = [];
  const store = new Map(savedChoice === null ? [] : [['zozhno-metrics-consent-v1', savedChoice]]);
  let reloads = 0;
  const document = {
    getElementById(id) { return nodes[id]; },
    createElement(tag) { return { tag }; },
    head: { appendChild(node) { requests.push(node.src); } }
  };
  const window = {
    localStorage: {
      getItem(key) { return store.get(key) ?? null; },
      setItem(key, value) { store.set(key, value); writes.push([key, value]); }
    },
    location: { reload() { reloads += 1; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/metrics.js'), 'utf8'), { window, document, Date });
  return { nodes, store, requests, writes, window, click(id) { listeners[`${id}:click`](); }, get reloads() { return reloads; } };
}

test('first visit never loads analytics until the visitor opts in', () => {
  const page = visit();
  assert.equal(page.nodes['stats-consent'].hidden, false);
  assert.deepEqual(page.requests, []);
  page.click('stats-allow');
  assert.deepEqual(page.requests, ['https://mc.yandex.ru/metrika/tag.js']);
  assert.equal(page.store.get('zozhno-metrics-consent-v1'), 'yes');
  assert.equal(page.nodes['stats-consent'].hidden, true);
  assert.equal(page.window.ym.a[0][0], 107087314);
  assert.equal(page.window.ym.a[0][1], 'init');
  assert.equal(page.window.ym.a[0][2].webvisor, false);
});

test('decline and repeat visits do not send analytics requests', () => {
  const page = visit();
  page.click('stats-deny');
  assert.equal(page.store.get('zozhno-metrics-consent-v1'), 'no');
  assert.deepEqual(page.requests, []);
  const again = visit('no');
  assert.equal(again.nodes['stats-consent'].hidden, true);
  assert.deepEqual(again.requests, []);
});

test('a prior opt-in loads analytics and withdrawing it blocks future visits', () => {
  const page = visit('yes');
  assert.deepEqual(page.requests, ['https://mc.yandex.ru/metrika/tag.js']);
  page.click('stats-settings');
  assert.equal(page.nodes['stats-consent'].hidden, false);
  page.click('stats-deny');
  assert.equal(page.store.get('zozhno-metrics-consent-v1'), 'no');
  assert.equal(page.reloads, 1);
  assert.deepEqual(visit('no').requests, []);
});

test('page discloses the purpose and has explicit accept, decline, and revisit controls', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="stats-consent"[^>]*hidden/);
  assert.match(html, /id="stats-allow"/);
  assert.match(html, /id="stats-deny"/);
  assert.match(html, /id="stats-settings"[^>]*hidden/);
  assert.match(html, /Яндекс Метрик/);
  assert.match(html, /assets\/metrics\.js/);
  assert.doesNotMatch(html, /mc\.yandex\.ru\/watch/);
});
