/* Общий код прототипов MY-50. Сети не касается: ни fetch, ни XHR, ни beacon.
   1) снимает класс no-js; 2) кнопки «Скопировать» (буфер обмена локально);
   (MY-56: панель демо-состояний MY-50 убрана — в кандидате её нет.) */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  /* ── Копирование шаблона ── */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function selectText(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  window.ProtoCopy = {
    forceFail: false,
    show: function (btn, ok) {
      var box = document.getElementById(btn.getAttribute('aria-controls'));
      var status = document.getElementById(btn.dataset.status);
      if (ok) {
        status.textContent = 'Скопировано. Откройте Telegram и вставьте текст в чат.';
      } else {
        selectText(box);
        status.textContent = 'Не удалось скопировать автоматически. Текст выделен — скопируйте его вручную.';
      }
    }
  };
  document.addEventListener('click', function (e) {
    // Только явные кнопки копирования (R6): у кнопок «Повторить» своего обработчика хватает
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var box = document.getElementById(btn.getAttribute('aria-controls'));
    if (!box || !document.getElementById(btn.dataset.status)) return;
    var text = box.innerText.trim();
    if (ProtoCopy.forceFail) { ProtoCopy.show(btn, false); return; }
    var done = function (ok) { ProtoCopy.show(btn, ok); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else {
      done(fallbackCopy(text));
    }
  });

})();
