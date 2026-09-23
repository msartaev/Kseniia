#!/usr/bin/env node
/*
  Собирает переносимый одиночный HTML: fonts.css, woff2, jpeg/jpg уходят
  внутрь файла как data:-URI. Результат открывается из любого каталога,
  картинки и шрифты не теряются.

  node qa/build-portable.mjs site/index.html dist/zozhno-onepage.html
*/
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

const src = resolve(process.argv[2] || 'site/index.html');
const out = resolve(process.argv[3] || 'dist/zozhno-onepage.html');
const srcDir = dirname(src);

const MIME = { '.woff2': 'font/woff2', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };

async function dataUri(relPath) {
  const clean = relPath.replace(/^\.\//, '').split(/[?#]/)[0];
  const ext = clean.slice(clean.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`Неизвестное расширение для инлайна: ${relPath}`);
  const bytes = await readFile(join(srcDir, clean));
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

let html = await readFile(src, 'utf8');

// 1. fonts.css -> <style> с инлайновыми woff2
const cssLink = /<link rel="stylesheet" href="(assets\/fonts\.css)">/;
const linkMatch = html.match(cssLink);
if (!linkMatch) throw new Error('Не найден <link> на fonts.css');
let css = await readFile(join(srcDir, linkMatch[1]), 'utf8');
const cssDir = dirname(linkMatch[1]);
for (const url of new Set([...css.matchAll(/url\((\.\/[^)]+)\)/g)].map(m => m[1]))) {
  css = css.split(`url(${url})`).join(`url(${await dataUri(join(cssDir, url))})`);
}
html = html.replace(cssLink, `<style>\n${css}</style>`);

// 2. <img src="assets/...">
for (const url of new Set([...html.matchAll(/<img[^>]+src="(assets\/[^"]+)"/g)].map(m => m[1]))) {
  html = html.split(`src="${url}"`).join(`src="${await dataUri(url)}"`);
}

// 3. CSS url(assets/...) внутри <style> страницы
for (const url of new Set([...html.matchAll(/url\((assets\/[^)"']+)\)/g)].map(m => m[1]))) {
  html = html.split(`url(${url})`).join(`url(${await dataUri(url)})`);
}

// 4. og:image / twitter:image — относительные пути вне каталога не работают,
//    а data:-URI соцсети не читают. Убираем, чтобы не обещать неработающее.
html = html.replace(/\s*<meta (?:property="og:image"|name="twitter:image")[^>]*>\n?/g, '\n');
html = html.replace(/<meta name="twitter:card" content="summary_large_image">/, '<meta name="twitter:card" content="summary">');

const leftover = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"|url\((assets\/[^)"']+)\)/g)];
if (leftover.length) throw new Error('Остались внешние ссылки: ' + leftover.map(m => m[1] || m[2]).join(', '));

await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(JSON.stringify({ out, bytes: Buffer.byteLength(html) }));
