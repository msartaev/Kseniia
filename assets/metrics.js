/* Analytics is opt-in: do not fetch tag.js or send hits before consent. */
(() => {
  const key = 'zozhno-metrics-consent-v1';
  const notice = document.getElementById('stats-consent');
  const settings = document.getElementById('stats-settings');
  const allow = document.getElementById('stats-allow');
  const deny = document.getElementById('stats-deny');
  const more = document.getElementById('stats-more');
  const title = document.getElementById('stats-consent-title');
  const current = document.getElementById('stats-current');
  const status = document.getElementById('stats-status');
  const main = document.getElementById('main');
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
    choice = value;
  }

  let reopened = false;
  let detailsOpen = false;
  function updateSpace() {
    const needsSpace = reopened || (detailsOpen && window.innerWidth >= 900);
    if (!needsSpace || notice.hidden) {
      document.body.classList.remove('stats-space');
      document.body.style.removeProperty('--stats-space');
      return;
    }
    document.body.classList.add('stats-space');
    document.body.style.setProperty('--stats-space', `${Math.ceil(notice.getBoundingClientRect().height) + 32}px`);
  }
  function hide(message) {
    const focusWasInside = notice.contains(document.activeElement);
    notice.hidden = true;
    notice.classList.remove('is-floating');
    settings.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('stats-space');
    document.body.style.removeProperty('--stats-space');
    if (reopened) settings.focus();
    else if (focusWasInside && main) main.focus({ preventScroll: true });
    if (status) status.textContent = message;
    reopened = false;
    detailsOpen = false;
  }
  settings.hidden = false;
  notice.hidden = choice === 'yes' || choice === 'no';
  settings.setAttribute('aria-expanded', String(!notice.hidden));
  if (choice === 'yes') start();
  allow.addEventListener('click', () => {
    save('yes');
    hide('Метрика включена. Изменить выбор можно в подвале: «Настройки cookie».');
    start();
  });
  deny.addEventListener('click', () => {
    save('no');
    hide('Метрика не включена. Изменить выбор можно в подвале: «Настройки cookie».');
    if (started) window.location.reload(); // stop an already loaded tag on this page
  });
  settings.addEventListener('click', () => {
    if (choice !== 'yes' && choice !== 'no') {
      if (title) title.focus();
      return;
    }
    if (reopened) {
      hide('Панель настроек cookie скрыта, выбор не изменён.');
      return;
    }
    reopened = true;
    if (current) {
      current.textContent = choice === 'yes' ? 'Сейчас Метрика включена.' : 'Сейчас Метрика выключена.';
      current.hidden = false;
    }
    allow.hidden = choice === 'yes';
    deny.hidden = choice !== 'yes';
    notice.classList.add('is-floating');
    notice.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    updateSpace();
    if (title) title.focus();
  });
  if (more) more.addEventListener('click', () => {
    if (window.innerWidth >= 900) {
      detailsOpen = true;
      updateSpace();
    }
  });
  window.addEventListener('resize', updateSpace);
})();
