// S26 flake hunter: sign up A + B, then load /search as B repeatedly and log
// every Firestore HTTP failure + whether Alice appears in results.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const A = { email: `sa.${stamp}@qa.test`, pass: 'Test1234!', name: 'SearchAlice' };
const B = { email: `sb.${stamp}@qa.test`, pass: 'Test1234!', name: 'SearchBob' };

async function signup(page, u) {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.locator('input[aria-label="Full name"]').fill(u.name);
  await page.locator('input[aria-label="Email address"]').fill(u.email);
  await page.locator('input[aria-label="Password"]').first().fill(u.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(u.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pA = await ctxA.newPage();
  const pB = await ctxB.newPage();
  await signup(pA, A);
  await signup(pB, B);

  for (let round = 1; round <= 5; round++) {
    const failures = [];
    const pageErrors = [];
    const onResp = (r) => {
      if (r.url().includes('firestore') && r.status() >= 400) {
        failures.push(`${r.status()} ${r.url().split('?')[0].slice(-60)}`);
      }
    };
    const onFailed = (r) => failures.push(`FAILED ${r.failure()?.errorText} ${r.url().split('?')[0].slice(-60)}`);
    const onErr = (e) => pageErrors.push(String(e).slice(0, 200));
    pB.on('response', onResp);
    pB.on('requestfailed', onFailed);
    pB.on('pageerror', onErr);

    await pB.goto(BASE + '/search', { waitUntil: 'domcontentloaded' });
    await pB.waitForTimeout(2500);
    const inp = pB.locator('input[aria-label="Search"]');
    await inp.fill('SearchAlice');
    let found = false;
    for (let i = 0; i < 12; i++) {
      const txt = await pB.locator('body').innerText();
      if (/SearchAlice/.test(txt)) { found = true; break; }
      await pB.waitForTimeout(1000);
    }
    const txt = await pB.locator('body').innerText();
    console.log(`round ${round}: found=${found} failures=${failures.length}${failures.length ? ' :: ' + failures.join(' | ') : ''}${pageErrors.length ? ' :: pageErrors=' + pageErrors.join(' | ') : ''}`);
    if (!found) console.log('  snippet: ' + txt.replace(/\s+/g, ' ').slice(0, 300));
    pB.off('response', onResp);
    pB.off('requestfailed', onFailed);
    pB.off('pageerror', onErr);
  }

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
