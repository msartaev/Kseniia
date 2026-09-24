/* Analytics is opt-in: do not fetch tag.js or send hits before consent. */
(() => {
  const key = 'zozhno-metrics-consent-v1';
  const notice = document.getElementById('stats-consent');
  const settings = document.getElementById('stats-settings');
  const allow = document.getElementById('stats-allow');
  const deny = document.getElementById('stats-deny');
  if (!notice || !settings || !allow || !deny) return;

  let choice = null;
  try { choice = window.localStorage.getItem(key); } catch (_) { /* ask again next visit */ }
  let started = false;
  function start() {
    if (started) return;
    started = true;
    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = Date.now();
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(tag);
    window.ym(107087314, 'init', {
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: false,
      webvisor: false
    });
  }
  function save(value) {
    try { window.localStorage.setItem(key, value); } catch (_) { /* choice still applies to this page */ }
  }

  settings.hidden = false;
  notice.hidden = choice === 'yes' || choice === 'no';
  if (choice === 'yes') start();
  allow.addEventListener('click', () => {
    save('yes');
    notice.hidden = true;
    start();
  });
  deny.addEventListener('click', () => {
    save('no');
    notice.hidden = true;
    if (started) window.location.reload(); // stop an already loaded tag on this page
  });
  settings.addEventListener('click', () => {
    notice.hidden = false;
    allow.focus();
  });
})();
