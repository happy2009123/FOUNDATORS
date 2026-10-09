const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `copilot.side2.${stamp}@qa.test`, pass: 'Test1234!', name: 'Side Probe 2' };

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const api = [];
  p.on('response', async (r) => { if (r.url().includes('/api/copilot')) { try { const j = await r.json(); api.push({ mode: j.mode, source: j.source }); } catch (e) {} } });

  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(U.name);
  await p.locator('input[aria-label="Email address"]').fill(U.email);
  await p.locator('input[aria-label="Password"]').first().fill(U.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2500);

  await p.goto(BASE + '/copilot', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  const sel = async () => p.evaluate(() => {
    const on = Array.from(document.querySelectorAll('section button'))
      .filter((x) => /text-gold-hi/.test(x.className))
      .map((x) => (x.innerText || '').trim())
      .filter((t) => /^(Analyze Idea|Validate|Plan MVP|Launch|Chat|Build With Me)$/.test(t));
    const sub = (document.querySelector('header') || {}).innerText;
    return { on, sub: sub ? sub.split('\n').pop() : null };
  });

  console.log('initial      ', JSON.stringify(await sel()));

  // the copilot sidebar is the aside that contains the "New chat" button
  const side = p.locator('aside').filter({ hasText: 'New chat' }).first();
  console.log('sidebar found:', await side.count());
  const chatBtn = side.locator('button', { hasText: /^Chat$/ }).first();
  console.log('chat btn     :', JSON.stringify(await chatBtn.innerText()));
  await chatBtn.click();
  await p.waitForTimeout(800);
  console.log('after click  ', JSON.stringify(await sel()));

  await p.locator('textarea').first().fill('Hello from sidebar Chat');
  api.length = 0;
  await p.getByRole('button', { name: /^Start$/ }).first().click();
  await p.waitForTimeout(5000);
  console.log('api          ', JSON.stringify(api));

  const bubble = await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.space-y-4 > div'));
    const t = els.map((e) => (e.innerText || '').trim()).filter((t) => /Copilot/i.test(t));
    return t[t.length - 1] || '(none)';
  });
  console.log('bubble       ', JSON.stringify(bubble.slice(0, 200)));
  await b.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
