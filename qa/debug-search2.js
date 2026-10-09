const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const B = { email: `sb.${stamp}@qa.test`, pass: 'Test1234!', name: 'SearchBob' };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(B.name);
  await p.locator('input[aria-label="Email address"]').fill(B.email);
  await p.locator('input[aria-label="Password"]').first().fill(B.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(B.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2500);
  await p.goto(BASE + '/search', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  const count = await p.locator('input[aria-label="Search"]').count();
  console.log('matching inputs:', count);
  const inp = p.locator('input[aria-label="Search"]').first();
  await inp.fill('SearchBob');
  console.log('input.value right after fill:', await inp.inputValue());
  await p.waitForTimeout(2000);
  console.log('input.value after 2s:', await inp.inputValue());
  const all = await p.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((i) => ({
      al: i.getAttribute('aria-label'),
      v: i.value,
      ph: i.placeholder,
    }))
  );
  console.log('all inputs:', JSON.stringify(all));
  const body = await p.locator('body').innerText();
  console.log('People:', /People/.test(body), '| TRENDING:', /TRENDING/.test(body));
  console.log('snippet:', body.replace(/\s+/g, ' ').slice(0, 400));
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
