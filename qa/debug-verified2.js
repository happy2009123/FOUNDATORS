const { chromium } = require('playwright');
const email = process.env.DBG_EMAIL;
const pass = 'Test1234!';

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto('http://localhost:3100/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('input[aria-label="Email address"]').fill(email);
  await page.locator('input[aria-label="Password"]').first().fill(pass);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(3000);

  // full reload directly into /create (fresh auth restore race)
  await page.goto('http://localhost:3100/create', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.locator('textarea[placeholder="Write your post"], textarea').first().fill('probe post');
  const btn = page.getByRole('button', { name: /^Post$/ }).first();
  console.log('A) after FULL reload into /create — disabled:', (await btn.getAttribute('disabled')) !== null);
  const hintA = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('   hint shown:', /Verify your email to post/.test(hintA));

  // SPA round-trip away and back (auth already initialized in this document)
  const backBtn = page.locator('button[aria-label="Go back"], a[href="/home"]').first();
  const hasBack = await backBtn.count();
  console.log('   back control present:', hasBack > 0);
  if (hasBack) {
    await backBtn.click();
    await page.waitForTimeout(2500);
    console.log('   after back, url:', new URL(page.url()).pathname);
    // navigate back to /create without a full reload (pushState link or direct SPA nav)
    const createLink = page.locator('a[href="/create"]').first();
    if (await createLink.count()) {
      await createLink.click();
    } else {
      // SPA nav via history + popstate won't mount next router; use in-app "+" if present
      const plus = page.locator('a[aria-label*="reate"], a[href="/create"], button[aria-label*="reate"]').first();
      if (await plus.count()) await plus.click();
      else await page.evaluate(() => { location.assign('/create'); });
    }
    await page.waitForTimeout(3000);
    const path = new URL(page.url()).pathname;
    console.log('   returned to:', path);
    if (path === '/create') {
      await page.locator('textarea[placeholder="Write your post"], textarea').first().fill('probe post 2');
      const btn2 = page.getByRole('button', { name: /^Post$/ }).first();
      console.log('B) after SPA remount — disabled:', (await btn2.getAttribute('disabled')) !== null);
      const hintB = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      console.log('   hint shown:', /Verify your email to post/.test(hintB));
    }
  }

  // C) banner re-check timing: reload into /home, poll banner every 1s for 6s
  await page.goto('http://localhost:3100/home', { waitUntil: 'domcontentloaded' });
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(1000);
    const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    if (i === 1 || i === 6) console.log(`C) home t=${i}s banner shown:`, /Verify your email/.test(t));
  }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
