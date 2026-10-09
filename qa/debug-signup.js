// Repro: does signup still create users/{uid} on the fresh emulator?
// Captures console errors + the setDoc outcome + resulting REST doc.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const email = `probe.${stamp}@qa.test`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 300)));

  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.locator('input[aria-label="Full name"]').fill('Probe User');
  await page.locator('input[aria-label="Email address"]').fill(email);
  await page.locator('input[aria-label="Password"]').first().fill('Test1234!');
  await page.locator('input[aria-label="Confirm password"]').fill('Test1234!');
  await page.getByRole('button', { name: /Create Account/ }).click();
  try {
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
    console.log('signup navigated to:', page.url());
  } catch (e) {
    console.log('signup did NOT navigate; url=', page.url());
    console.log('body:', (await page.locator('body').innerText()).slice(0, 400));
  }
  await page.waitForTimeout(4000);

  const uid = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('foundators-storage') || '{}');
      return s?.state?.profile?.id || null;
    } catch (e) { return null; }
  });
  console.log('store profile.id:', uid);

  const owner = async (path) => {
    try {
      const r = await fetch(`http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/${path}`, {
        headers: { Authorization: 'Bearer owner' },
      });
      return `${r.status} ${(await r.text()).slice(0, 300)}`;
    } catch (e) { return 'fetch err ' + e; }
  };
  if (uid) console.log('REST users/' + uid + ':', await owner('users/' + uid));
  const body = '{"structuredQuery": {"from": [{"collectionId": "users"}], "limit": 5}}';
  try {
    const r = await fetch('http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents:runQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body,
    });
    console.log('users list:', (await r.text()).slice(0, 800));
  } catch (e) { console.log('list err', e); }

  console.log('--- console errors ---');
  errors.slice(0, 15).forEach((e) => console.log('  ' + e));
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
