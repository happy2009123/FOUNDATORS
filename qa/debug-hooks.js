// qa/debug-hooks.js — P2-C repro: /bookmarks/collections hooks-order crash.
// Loads the page and captures the "Rendered more hooks" console error.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `hk.${stamp}@qa.test`, pass: 'Test1234!', name: 'Hooks Probe' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const hooksErrs = [];
  p.on('console', (m) => {
    const t = typeof m.text === 'function' ? m.text() : String(m);
    if (/Rendered more hooks|Rules of Hooks|change in the order of Hooks/i.test(t)) hooksErrs.push(t.replace(/\s+/g, ' ').slice(0, 240));
  });
  p.on('pageerror', (e) => { if (/hook/i.test(String(e))) hooksErrs.push('PAGEERROR ' + String(e).slice(0, 240)); });

  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(U.name);
  await p.locator('input[aria-label="Email address"]').fill(U.email);
  await p.locator('input[aria-label="Password"]').first().fill(U.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2000);

  // navigate via SPA (button nav) so the component mounts without a hard reload
  await p.goto(BASE + '/bookmarks', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.goto(BASE + '/bookmarks/collections', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  const bodyLen = (await p.locator('body').innerText().catch(() => '')).length;
  console.log('P2-C hooks-order errors captured:', hooksErrs.length);
  hooksErrs.forEach((e, i) => console.log(`  [${i}] ${e}`));
  console.log('page body length after visit:', bodyLen);
  console.log(hooksErrs.length > 0 ? 'REPRO OK — bug present' : 'NO REPRO');
  await browser.close();
  process.exit(hooksErrs.length > 0 ? 0 : 2);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
