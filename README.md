# Zozhno · сайт Ксении Галаниной

Лендинг нутрициолога Ксении Галаниной. Один HTML-файл со встроенным CSS и минимальным JS, шрифты и картинки лежат рядом.

## Структура каталога

```
site/                 финальный источник
  index.html          страница (HTML + <style> + <script>)
  assets/             шрифты (woff2 + fonts.css), два jpeg
    IMG_7260.jpeg     портрет на первом экране
    02-warm-closeup.jpg портрет в блоке «Знакомство»
    fonts.css         определения @font-face
    *.woff2           Lora, Golos Text
    *-OFL.txt         лицензии шрифтов

dist/                 экспорт
  zozhno-onepage.html переносный одиночный HTML (assets в data:-URI),
                       открывается из любого каталога без потерь
  zozhno-site.zip     архив с обеими формами: zozhno-onepage.html
                       плюс site/index.html + site/assets/

renders/              свежие скриншоты Playwright/Chromium
  final-*             ключевые размеры (320×740, 390×844, 768×1024, 1440×900)
  final-*-reduce      то же, но с prefers-reduced-motion: reduce
  final-390x844-nojs  то же, но с javaScriptEnabled: false
  full-*              полные прокрученные страницы (1440×900 и 390×844)
  menu-open-*         мобильное меню раскрыто (320×740, 390×844)
  faq-open-*          раскрытый первый вопрос FAQ
  me-*                личный блок на четырёх контрольных ширинах

qa/                   рабочие скрипты (используют уже установленный Playwright)
  check-menu-matrix.cjs матрица source/standalone/ZIP × 4 ширины × JS/no-JS
  menu-regression.cjs  адресная регрессия исходного дефекта
  evidence/            первичные JSON и логи новой проверки
  build-portable.mjs  сборка одного переносного HTML из site/index.html
  build-zip.py        сборка ZIP с переносным HTML и папкой site/
  shots.mjs           пересъёмка скриншотов
  inspect-me.mjs      отдельные снимки личного блока на четырёх ширинах
  check-portrait.mjs  загрузка фото, размеры, ошибки и режимы без JS/reduced motion
  inspect-export.mjs  проверка двух экспортов из изолированной папки
  checks.mjs          функциональные проверки (Tab/фокус/якоря/FAQ/меню/движение)
  check-factual-copy.py точная сверка формата услуги во всех формах поставки и copy

copy.md               весь видимый текст страницы + честные пробелы
motion-plan.md        описание реальных анимаций в файле
DECISIONS.md          история решения и выбор портрета
report.md             матрица изменения и локальных проверок
README.md             этот файл
```

## Как открыть

Прямо из рабочего каталога:

```bash
xdg-open site/index.html       # Linux
open    site/index.html       # macOS
start   site\index.html       # Windows
```

Или просто перетянуть `site/index.html` в браузер. Картинки и шрифты подтянутся из `site/assets/` по относительным путям.

Переносный экспорт:

```bash
xdg-open dist/zozhno-onepage.html
```

Внутри один файл — картинки и шрифты зашиты как `data:` URI. Каталог больше не нужен, можно кинуть в Telegram, на флешку, открыть с рабочего стола.

## Что внутри страницы

Структура сверху вниз: шапка с логотипом «Zozhno / Ксения Галанина» и меню (Форматы, Как проходит, Вопросы, Telegram); первый экран — рубрика, H1 «Питание, с которым вам удобно жить», лид, две CTA-кнопки, портрет справа; тёмная бегущая строка (декоративная, `aria-hidden`); вводный разворот; тёмная секция «Форматы работы» с тремя карточками (первичная, повторная, «Месяц со мной»); светлая «Как проходит работа» с тремя шагами; личный блок с отдельным портретом, текстом и ссылкой на канал; FAQ на пять вопросов плюс медицинский дисклеймер; финальный CTA на тёмном фоне; подвал.

Портрет `02-warm-closeup.jpg` получен от Михаила в комментарии MY-21 `01a0ce4b-10eb-7caa-ae1b-c857ffd5f08f`: он подтвердил, что это Ксения, и разрешил использовать фото только в приватном макете. Публичный выпуск этой версии с фото не разрешён. Лицо остаётся целым в мобильном и десктопном кадрировании.

Бегущая строка — существующая анимация в коде; её утверждение владельцем не зафиксировано.

Все тексты и факты зафиксированы в `copy.md`, анимации — в `motion-plan.md`. Это полное описание того, что есть в `site/index.html`, без догадок.

## Доступность

- Видимый фокус на каждом интерактивном элементе (`outline: 3px solid var(--focus)`), на тёмном фоне — `#e9b45f`.
- Пропуск ссылок «К содержанию», скрытый до фокуса.
- На узких экранах меню — нативный `<details><summary>Разделы</summary>…</details>`. Клик и Enter открывают и закрывают его с JavaScript и без него. Без JavaScript оно сначала открыто; с JavaScript сначала закрыто. Список и кнопка находятся в потоке шапки, а на desktop навигация остаётся видимой.
- `prefers-reduced-motion: reduce` отключает все анимации; `html { scroll-behavior: auto }`, чтобы не было плавного скролла к якорям.
- Цены и длительности защищены неразрывными пробелами (`.nbr { white-space: nowrap }`) — «9 000 ₽», «от 90 минут», «45–60 минут», «4 недели» не разрываются ни на одном проверяемом viewport.
- У обоих портретов есть alt; у нового — точное имя «Ксения Галанина». Бегущая строка помечена `aria-hidden="true"`.

## Что пересобрать

В этой сдаче использованы уже установленные Playwright в `MY-24/qa/node_modules` и Chromium 140 в `MY-23/qa-preflight/browser-cache`. Локальный симлинк `qa/node_modules` нужен для ESM-скриптов; он не входит в пакет сдачи. Зависимости и браузер не копировались и не устанавливались.

Пересборка экспорта:

```bash
node qa/build-portable.mjs site/index.html dist/zozhno-onepage.html
python3 qa/build-zip.py
```

Системного `zip` в окружении нет — собираем через Python `zipfile`.

Скриншоты:

```bash
PLAYWRIGHT_BROWSERS_PATH=/var/lib/multica/workspaces/mikhail-682a7b240b3e/my-23-e720c6fdf392/workdir/qa-preflight/browser-cache \
  node qa/shots.mjs site/index.html renders
```

Функциональные проверки (Tab/фокус/якоря/FAQ/меню/движение/нет горизонтального скролла):

```bash
PLAYWRIGHT_BROWSERS_PATH=/var/lib/multica/workspaces/mikhail-682a7b240b3e/my-23-e720c6fdf392/workdir/qa-preflight/browser-cache \
  node qa/checks.mjs site/index.html
```

Адресная матрица меню после сборки и распаковки ZIP:

```bash
mkdir -p qa/evidence/empty qa/evidence/unpacked
cp dist/zozhno-onepage.html qa/evidence/empty/index.html
python3 -m zipfile -e dist/zozhno-site.zip qa/evidence/unpacked
PLAYWRIGHT_BROWSERS_PATH=./qa/browser-cache node qa/check-menu-matrix.cjs \
  site/index.html qa/evidence/empty/index.html \
  qa/evidence/unpacked/site/index.html qa/evidence/unpacked/zozhno-onepage.html
```

`qa/evidence/menu-matrix.json` фиксирует 32 случая: четыре формы, четыре ширины, JS/no-JS; клик и Enter дважды, границы элементов, overflow, ресурсы, цену, FAQ и reduced motion. PNG в `renders/` относятся к SHA исходника из `report.md`. `python3 qa/check-factual-copy.py` сверяет source, standalone, оба HTML внутри ZIP и `copy.md`. Локальный WebKit и реальный iOS здесь не проверены.

Скрипты `qa/*` рассчитаны на запуск из корня workdir, сохранение в `dist/` и `renders/` создаётся автоматически. Версия браузера под `browser-cache` — Chromium 140.

## Факты, которые нужно сохранять

Ксения Галанина, нутрициолог, взрослые 18+. Первичная онлайн — от 90 минут, 9 000 ₽. Повторная — 45–60 минут, 5 000 ₽. Сопровождение — 4 недели, цена по запросу. Консультация проходит онлайн; платформа не подтверждена. Личный Telegram — `https://t.me/Rrroxy`, канал — `https://t.me/zozhno_vozmozhno`. Никакого стажа, дипломов, отзывов, счётчиков, дефицита мест и «плана за три дня». «От 90» остаётся «от 90», не превращается в «90».
