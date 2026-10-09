const { chromium } = require('playwright');
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const email = process.env.DBG_EMAIL;
const pass = 'Test1234!';

async function verifyRest() {
  const s = await fetch(`${IDB}/accounts:signInWithPassword?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  }).then((r) => r.json());
  if (!s.idToken) throw new Error('signin: ' + JSON.stringify(s).slice(0, 100));
  await fetch(`${IDB}/accounts:sendOobCode?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: s.idToken }),
  });
  await new Promise((r) => setTimeout(r, 300));
  const codes = await fetch('http://localhost:9099/emulator/v1/projects/foundators-66eb7/oobCodes')
    .then((r) => r.json());
  const mine = (codes.oobCodes || []).filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL');
  for (const c of mine.slice(-3)) await fetch(c.oobLink, { redirect: 'manual' }).catch(() => {});
  const lk = await fetch(`${IDB}/accounts:lookup?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: s.idToken }),
  }).then((r) => r.json());
  console.log('server emailVerified:', lk.users?.[0]?.emailVerified, '| oob links visited:', mine.length);
  return lk.users?.[0]?.emailVerified === true;
}

(async () => {
  await verifyRest();
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const loc = m.location();
    console.log('  [err]', m.text().slice(0, 160), '@', (loc && loc.url || '').slice(0, 120));
  });
  await page.goto('http://localhost:3100/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('input[aria-label="Email address"]').fill(email);
  await page.locator('input[aria-label="Password"]').first().fill(pass);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2500);

  // 1) banner on /home: shown right after load? disappears after poll/interval?
  await page.goto('http://localhost:3100/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const t0 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('home banner at t=2.5s:', /Verify your email/.test(t0));
  await page.waitForTimeout(32000);
  const t1 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('home banner after 32s (interval poll):', /Verify your email/.test(t1));
  // focus event forces immediate re-check
  await page.bringToFront();
  await page.waitForTimeout(1500);
  const t2 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('home banner after focus:', /Verify your email/.test(t2));

  // 2) /create gate over time
  await page.goto('http://localhost:3100/create', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.locator('textarea[placeholder="Write your post"], textarea').first().fill('probe post');
  const btn = page.getByRole('button', { name: /^Post$/ }).first();
  for (const ms of [0, 2000, 5000, 10000]) {
    if (ms) await page.waitForTimeout(ms - (ms === 2000 ? 0 : ms === 5000 ? 3000 : 5000));
    const dis = await btn.getAttribute('disabled');
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    console.log(`create t≈${ms}ms disabled=${dis !== null} hint=${/Verify your email to post/.test(txt)}`);
  }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
