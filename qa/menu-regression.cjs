const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const assert = require('assert');
const target = process.argv[2];
if (!target) throw new Error('Pass standalone HTML path');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const enabled of [true, false]) {
      const context = await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:enabled});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(target).href);
      const trigger = page.locator('.menu-toggle');
      const nav = page.locator('#menu-list');
      assert(await trigger.isVisible(), 'mobile menu control must be visible');
      const initial = await nav.isVisible();
      await trigger.click();
      const afterFirst = await nav.isVisible();
      await trigger.click();
      const afterSecond = await nav.isVisible();
      console.log('MOBILE', JSON.stringify({js:enabled, initial, afterFirst, afterSecond, errors}));
      assert.notEqual(afterFirst, initial, `menu must toggle with JS=${enabled}`);
      assert.equal(afterSecond, initial, `menu must toggle back with JS=${enabled}`);
      assert.deepEqual(errors, [], 'no page errors');
      await context.close();
    }
    const context = await browser.newContext({viewport:{width:1440,height:900},javaScriptEnabled:false});
    const page = await context.newPage();
    await page.goto(pathToFileURL(target).href);
    assert(await page.locator('#menu-list').isVisible(), 'desktop navigation visible without JS');
    console.log('DESKTOP no-JS navigation visible');
    await context.close();
  } finally {await browser.close();}
})().catch(e => {console.error(e.stack);process.exitCode=1});
