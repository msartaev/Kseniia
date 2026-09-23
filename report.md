# MY-24 · адресная фактическая правка

База: source `3bad456c4f5c2e5a350f0a290344ed72a9141ea3a074caf2ce353dc9c19376af` из snapshot `9a409ba04a0b8eb56872d04f982a1c0443a312b9`. Входные 28 файлов сверены с `input-sha256.json` до копирования; каталог базы не менялся.

Версия сдачи (SHA-256):

- `site/index.html`: `59d4e4aa30b4eaf38eda9be70cce31644654839ea9a1af18b7edd9764626f92a`
- `dist/zozhno-onepage.html`: `41a37b5f6af0e9ed96caa14f69a91d036765915c8f30c46cfc30222559fb3ac1`
- `dist/zozhno-site.zip`: `db595f343015412300bc257662cfbe22bf348abb5dd7c31ba0270cc9445a8ba1`

Единственный смысловой diff source: первый вопрос FAQ «Где проходят встречи?» заменён на «Как проходит консультация?», ответ с Zoom/Telegram как платформой и возможной личной встречей в Москве заменён на «Консультация проходит онлайн.». Те же две строки синхронно заменены в `copy.md`. Контактные ссылки Telegram и подтверждённая связь в составе сопровождения сохранены. Геометрия, портрет, CTA, цены, остальные тексты и native `details/summary` меню не менялись.

| Требование | Проверка и первичное свидетельство | Итог |
| --- | --- | --- |
| Фактический формат во всех пользовательских текстах | `python3 qa/check-factual-copy.py`; `qa/evidence/factual-copy.log` проверяет видимый текст source/standalone/двух HTML ZIP и `copy.md`, а также сохранение контактов/сопровождения | 5/5 PASS |
| Переносимые экспорты | `node qa/build-portable.mjs`, `python3 qa/build-zip.py`; `ZipFile.testzip()` и сравнение байтов 13 файлов; открытие из `qa/evidence/empty` и распакованного ZIP, `qa/evidence/inspect-export.log` | PASS |
| FAQ, anchors, CTA, цена, фокус, no-JS, ширина | `node qa/checks.mjs site/index.html`; `qa/evidence/checks.log` | 31/31 PASS |
| Меню с JS/no-JS, клик/Enter дважды, четыре формы поставки на 320/390/768/1440 | `node qa/check-menu-matrix.cjs ...`; `qa/evidence/menu-matrix.json` и `.log` | 32/32 PASS |
| Композиция и текст на актуальном HTML | Chromium 140, `node qa/shots.mjs`; просмотрены `renders/final-320x740.png`, `final-390x844.png`, `final-768x1024.png`, `final-1440x900.png`, `faq-open-390x844.png`, `full-390x844.png` | Видимых дефектов и overflow не обнаружено |

`renders/faq-open-390x844.png` переснят с ожиданием конца анимации, поэтому новый ответ читается в устойчивом состоянии. Скриншоты относятся к SHA source выше. Локальный WebKit и реальный iOS не проверены. `02-warm-closeup.jpg` разрешён лишь для приватного макета; публичный выпуск этой версии с фото не разрешён. Независимые MY-25/MY-26 должны проверять именно эти новые SHA; прежние PASS к ним не относятся. Push/deploy не выполнялись.
