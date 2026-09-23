const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const variants = process.argv.slice(2);
if (variants.length !== 4) throw new Error('Expected source, standalone, ZIP site, ZIP standalone paths');
const sizes = [[320,740],[390,844],[768,1024],[1440,900]];
const evidence = path.resolve('qa/evidence');
const renders = path.resolve('renders/menu-review');
fs.mkdirSync(evidence, {recursive:true});
fs.mkdirSync(renders, {recursive:true});

function overlap(a,b) {
  if (!a || !b) return false;
  return Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 &&
    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
}

(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (let v=0; v<variants.length; v++) {
      for (const [width,height] of sizes) {
        for (const js of [true,false]) {
          const context = await browser.newContext({viewport:{width,height},javaScriptEnabled:js,reducedMotion:'reduce'});
          const page = await context.newPage();
          const errors = [], failed = [];
          page.on('pageerror',e=>errors.push(e.message));
          page.on('requestfailed',r=>failed.push(r.url()));
          const row = {variant:['source','standalone','zip-site','zip-standalone'][v],width,height,js};
          try {
            await page.goto(pathToFileURL(path.resolve(variants[v])).href);
            await page.evaluate(()=>document.fonts.ready);
            await page.evaluate(async()=>{for(const img of document.images){img.loading='eager';await img.decode().catch(()=>{});}});
            const menu=page.locator('.site-menu'), control=page.locator('.menu-toggle'), nav=page.locator('#menu-list');
            row.initial=await nav.isVisible();
            if(width<=860) {
              assert(await control.isVisible());
              await control.click(); row.click1=await nav.isVisible();
              await control.click(); row.click2=await nav.isVisible();
              assert.notEqual(row.click1,row.initial);
              assert.equal(row.click2,row.initial);
              await control.focus(); await page.keyboard.press('Enter'); row.enter1=await nav.isVisible();
              await page.keyboard.press('Enter'); row.enter2=await nav.isVisible();
              assert.notEqual(row.enter1,row.initial);
              assert.equal(row.enter2,row.initial);
              if(v===0 && (js || width===390)) {
                await page.evaluate(()=>scrollTo(0,0));
                await page.screenshot({path:path.join(renders,`source-${width}-${js?'js':'nojs'}-${row.initial?'open':'closed'}.png`)});
                await control.click();
                await page.evaluate(()=>scrollTo(0,0));
                await page.screenshot({path:path.join(renders,`source-${width}-${js?'js':'nojs'}-${row.initial?'closed':'open'}.png`)});
                await control.click();
              }
            } else {
              assert(row.initial,'desktop nav hidden');
              assert(!(await control.isVisible()),'desktop summary visible');
              if(v===0 && js) await page.screenshot({path:path.join(renders,'source-1440-desktop.png')});
            }
            row.geometry=await page.evaluate(() => {
              const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
              return {header:box('header'),logo:box('.logo'),control:box('.menu-toggle'),nav:box('#menu-list'),hero:box('.hero'),
                links:[...document.querySelectorAll('#menu-list a')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}),
                scrollWidth:document.documentElement.scrollWidth, viewport:innerWidth};
            });
            const g=row.geometry;
            assert(g.scrollWidth<=width+1,'horizontal overflow');
            assert(!overlap(g.logo,g.control),'logo/control overlap');
            assert(g.logo.bottom<=g.header.bottom+1,'logo outside header');
            if(width<=860) assert(g.control.bottom<=g.header.bottom+1,'control outside header');
            if(await nav.isVisible()) {
              assert(g.nav.bottom<=g.header.bottom+1,'nav outside header');
              assert(!overlap(g.nav,g.hero),'nav/hero overlap');
              assert(g.links.every(l=>!overlap(l,g.logo)&&!overlap(l,g.control)),'link/control overlap');
            }
            row.content=await page.evaluate(()=>({
              portrait:[...document.images].filter(i=>i.src.includes('02-warm-closeup')||i.alt.includes('Ксения')).map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth})),
              fonts:document.fonts.status,
              price:/9\s*000\s*₽/.test(document.body.textContent),
              faq:!!document.querySelector('#faq details'),
              reducedAnimation:getComputedStyle(document.querySelector('.hero-portrait img')).animationDuration,
            }));
            assert(row.content.portrait.every(i=>i.loaded),'portrait failed to load');
            assert(row.content.price&&row.content.faq,'price or FAQ missing');
            assert.equal(row.content.fonts,'loaded');
            assert.equal(row.content.reducedAnimation,'0s');
            assert.deepEqual(errors,[]); assert.deepEqual(failed,[]);
            if(v===0&&width===390&&js) {
              const faq=page.locator('#faq details').first();
              await faq.locator('summary').click(); assert(await faq.getAttribute('open')!==null);
              await page.locator('a[href="#formats"]').last().click();
              assert.equal(new URL(page.url()).hash,'#formats');
            }
            row.pass=true;
          } catch(e) {row.pass=false;row.error=e.message;}
          row.errors=errors;row.failedRequests=failed;
          results.push(row);
          await context.close();
        }
      }
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(evidence,'menu-matrix.json'),JSON.stringify(results,null,2));
  const failures=results.filter(r=>!r.pass);
  console.log(JSON.stringify({cases:results.length,pass:results.length-failures.length,failures:failures.map(({variant,width,js,error})=>({variant,width,js,error}))},null,2));
  if(failures.length) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
