// qa/debug-nested.js — P3-C repro: nested <button> inside <button> on /gestures/community.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `nb.${stamp}@qa.test`, pass: 'Test1234!', name: 'Nested Probe' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const hydrationErrs = [];
  p.on('console', (m) => {
    const t = typeof m.text === 'function' ? m.text() : String(m);
    if (/cannot be a descendant|cannot contain a nested|hydration error/i.test(t)) hydrationErrs.push(t.replace(/\s+/g, ' ').slice(0, 240));
  });

  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(U.name);
  await p.locator('input[aria-label="Email address"]').fill(U.email);
  await p.locator('input[aria-label="Password"]').first().fill(U.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2000);

  await p.goto(BASE + '/gestures/community', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  const nested = await p.evaluate(() => {
    const out = [];
    for (const outer of document.querySelectorAll('button button')) {
      out.push({ outer: (outer.parentElement.innerText || '').replace(/\s+/g, ' ').slice(0, 80) });
    }
    return out;
  });
  console.log('P3-C hydration errors captured:', hydrationErrs.length);
  hydrationErrs.forEach((e, i) => console.log(`  [${i}] ${e}`));
  console.log('DOM nested <button> count:', nested.length, nested.slice(0, 3));
  const ok = hydrationErrs.length > 0 || nested.length > 0;
  console.log(ok ? 'REPRO OK — bug present' : 'NO REPRO');
  await browser.close();
  process.exit(ok ? 0 : 2);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
