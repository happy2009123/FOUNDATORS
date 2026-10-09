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
  await page.waitForTimeout(4000);

  // SPA push to /create from a settled-auth home page
  const createBtn = page.locator('button', { hasText: /^Create$/ }).first();
  console.log('header Create button:', await createBtn.count());
  await createBtn.click({ timeout: 8000 });
  await page.waitForURL(/\/create/, { timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.locator('textarea[placeholder="Write your post"], textarea').first().fill('spa probe');
  const btn = page.getByRole('button', { name: /^Post$/ }).first();
  const dis1 = (await btn.getAttribute('disabled')) !== null;
  const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('SPA nav /create → disabled:', dis1, '| hint:', /Verify your email to post/.test(txt));

  // now FULL reload the same /create route (fresh auth restore race)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.locator('textarea[placeholder="Write your post"], textarea').first().fill('reload probe');
  const btn2 = page.getByRole('button', { name: /^Post$/ }).first();
  const dis2 = (await btn2.getAttribute('disabled')) !== null;
  const txt2 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('FULL reload /create → disabled:', dis2, '| hint:', /Verify your email to post/.test(txt2));

  // and one more full reload, waiting longer (does it ever self-heal?)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  const btn3 = page.getByRole('button', { name: /^Post$/ }).first();
  const dis3 = (await btn3.getAttribute('disabled')) !== null;
  const txt3 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('FULL reload +15s → disabled:', dis3, '| hint:', /Verify your email to post/.test(txt3));

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
