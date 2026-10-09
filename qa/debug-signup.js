const { chromium } = require('playwright');
const BASE = process.env.QA_BASE || 'http://localhost:3100';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const net = [];
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 300)}`));
  page.on('request', (r) => {
    const u = r.url();
    if (/9099|8080|identitytoolkit|firestore|googleapis|localhost:3100\/api/.test(u))
      net.push(`REQ ${r.method()} ${u.slice(0, 140)}`);
  });
  page.on('response', (r) => {
    const u = r.url();
    if (/9099|8080|identitytoolkit|firestore|localhost:3100\/api/.test(u))
      net.push(`RES ${r.status()} ${u.slice(0, 140)}`);
  });

  const stamp = Date.now();
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Full name').fill('Debug User');
  await page.getByLabel('Email address').fill(`dbg${stamp}@example.com`);
  await page.getByLabel('Password', { exact: false }).first().fill('Test1234!');
  await page.getByLabel('Confirm password').fill('Test1234!');
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForTimeout(8000);

  const toasts = await page.evaluate(() =>
    [...document.querySelectorAll('[class*=toast],[role=alert],[role=status]')]
      .map((n) => n.innerText.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  );
  const url = page.url();
  console.log('URL:', url);
  console.log('TOASTS:', JSON.stringify(toasts));
  console.log('--- network ---');
  net.forEach((n) => console.log(n));
  console.log('--- console ---');
  logs.slice(0, 30).forEach((l) => console.log(l));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
