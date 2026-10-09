// P3-A targeted repro: e2e pinned the duplicate-key warning to S05
// (onboarding completion -> /home). This probe replicates that flow with a
// wider stack slice and captures the actual duplicate key value (args[1]).
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `k5.${stamp}@qa.test`, pass: 'Test1234!', name: 'Key Probe Five' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__keyWarnings = [];
    const orig = console.error;
    console.error = function (...args) {
      try {
        const msg = String(args[0] === undefined ? '' : args[0]);
        if (/same key|duplicate/i.test(msg)) {
          window.__keyWarnings.push({
            msg: msg.slice(0, 160),
            key: args.length > 1 ? String(args[1]).slice(0, 120) : null,
            argLen: args.length,
            allArgs: args.slice(0, 4).map((a) => String(a).slice(0, 120)),
            stack: new Error('keywarn').stack,
          });
        }
      } catch (e) { /* ignore */ }
      return orig.apply(console, args);
    };
  });
  const collected = [];
  async function drain(tag) {
    try {
      const warns = await page.evaluate(() => {
        const w = window.__keyWarnings || [];
        window.__keyWarnings = [];
        return w;
      });
      warns.forEach((w) => collected.push({ tag, url: page.url(), ...w }));
    } catch (e) { /* nav */ }
  }

  // signup (same shape as e2e)
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.locator('input[aria-label="Full name"]').fill(U.name);
  await page.locator('input[aria-label="Email address"]').fill(U.email);
  await page.locator('input[aria-label="Password"]').first().fill(U.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  // dismiss cookie banner so it cannot intercept onboarding clicks
  try {
    const ck = page.locator('button', { hasText: /accept|agree|got it|okay/i }).first();
    if (await ck.isVisible({ timeout: 1200 })) await ck.click({ timeout: 1500 });
  } catch (e) { /* no banner */ }
  await drain('post-signup');

  // onboarding loop (same shape as e2e S05) with progress logging
  for (let i = 0; i < 8 && /onboarding/.test(page.url()); i++) {
    const nameInput = page.locator('input:visible').first();
    const ic = await nameInput.count();
    if (ic) await nameInput.fill(U.name).catch((e) => console.log('  fill err', String(e).slice(0, 80)));
    const chip = page.getByRole('button', { name: /Founder/ }).first();
    const cc = await chip.count();
    if (cc) await chip.click().catch((e) => console.log('  chip err', String(e).slice(0, 80)));
    const btn = page.getByRole('button', { name: /^(Continue|Next|Finish|Done|Skip|Start|Go)/i }).first();
    const bc = await btn.count();
    let clicked = false;
    if (bc) {
      await btn.click({ timeout: 4000 }).then(() => { clicked = true; }).catch((e) => console.log('  btn err', String(e).slice(0, 120)));
    }
    await page.waitForTimeout(1600);
    const heading = await page.evaluate(() => {
      const h = document.querySelector('main h1, main h2, h1, h2');
      const dots = document.querySelectorAll('[class*="rounded-full"][class*="bg-gold"]').length;
      return { h: h ? h.textContent.slice(0, 60) : null, goldDots: dots, disabled: (() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => /^(Continue|Next|Finish|Done|Skip|Start|Go)/i.test(x.textContent || ''));
        return b ? b.disabled : null;
      })() };
    });
    console.log(`  iter ${i}: inputs=${ic} founderChips=${cc} continueBtn=${bc} clicked=${clicked} state=${JSON.stringify(heading)} url=${new URL(page.url()).pathname}`);
    await drain('onboarding-step-' + i);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await drain('after-reload-home');

  // linger on /home to catch listener-driven re-renders
  for (let i = 0; i < 6; i++) {
    await page.evaluate(async () => {
      window.scrollBy(0, window.innerHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    await drain('home-linger-' + i);
  }

  console.log('final url:', page.url());
  if (/onboarding/.test(page.url())) {
    console.log('ONBOARDING NOT COMPLETED. body snippet:');
    console.log((await page.locator('body').innerText()).slice(0, 500));
  }
  console.log('captured:', collected.length);
  collected.forEach((w, i) => {
    console.log(`\n[${i}] tag=${w.tag} url=${w.url}`);
    console.log('  key:', JSON.stringify(w.key), 'argLen=', w.argLen);
    console.log('  msg:', w.msg);
    String(w.stack || '').split('\n').slice(1, 60).forEach((f) => console.log('    ' + f.trim().slice(0, 230)));
  });
  require('fs').writeFileSync('qa/results/key-warnings-s05.json', JSON.stringify(collected, null, 2));
  await browser.close();
  process.exit(collected.length ? 0 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
