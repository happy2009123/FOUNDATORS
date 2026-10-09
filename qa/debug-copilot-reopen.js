// Are messages actually persisted, and do they reload when the thread is reopened?
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();

(async () => {
  const browser = await chromium.launch();
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  await p.locator('input[aria-label="Full name"]').fill('Persist Check');
  await p.locator('input[aria-label="Email address"]').fill(`persist.${stamp}@qa.test`);
  await p.locator('input[aria-label="Password"]').first().fill('Test1234!');
  await p.locator('input[aria-label="Confirm password"]').fill('Test1234!');
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2500);

  await p.goto(BASE + '/copilot', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  const bubbles = () => p.evaluate(() =>
    Array.from(document.querySelectorAll('.space-y-4 > div')).map((e) => (e.innerText || '').trim()).filter((t) => /Copilot/i.test(t))
  );

  await p.locator('textarea').first().fill('Persist me: a marketplace for indie founders');
  await p.getByRole('button', { name: /^Start$/ }).first().click();
  await p.waitForTimeout(6000);
  console.log('1 after send        :', (await bubbles()).length, 'bubble(s)');

  // reload -> home; reopen the recent conversation
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  console.log('2 after reload(home):', (await bubbles()).length, 'bubble(s)');

  const recentBtn = p.locator('button').filter({ hasText: 'Persist me' }).first();
  const n = await recentBtn.count();
  console.log('3 recent entry found:', n);
  if (n) {
    await recentBtn.click();
    await p.waitForTimeout(4000);
    const bs = await bubbles();
    console.log('4 after reopen      :', bs.length, 'bubble(s)');
    bs.forEach((x, i) => console.log(`   [${i}]`, JSON.stringify(x.slice(0, 90))));
    console.log('PERSISTENCE:', bs.length >= 1 ? 'PASS' : 'FAIL');
  } else {
    console.log('PERSISTENCE: FAIL (no recent entry)');
  }

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
