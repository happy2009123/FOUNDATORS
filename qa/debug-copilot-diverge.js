// Does the desktop sidebar mode selector actually affect what CopilotHome sends?
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `copilot.div.${stamp}@qa.test`, pass: 'Test1234!', name: 'Div Probe' };

async function setup(p) {
  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(U.name);
  await p.locator('input[aria-label="Email address"]').fill(U.email);
  await p.locator('input[aria-label="Password"]').first().fill(U.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch();
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const api = [];
  p.on('response', async (r) => {
    if (r.url().includes('/api/copilot')) {
      let b = null; try { b = await r.json(); } catch (e) {}
      api.push({ mode: b && b.mode, source: b && b.source });
    }
  });
  await setup(p);

  async function freshHome() {
    await p.goto(BASE + '/copilot', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2200);
  }

  // CASE 1: click Chat in the COPILLOT SIDEBAR (the aside containing "New chat";
  // the nav rail is also an <aside>, so filter to avoid clicking the wrong one)
  await freshHome();
  const asideChat = p.locator('aside').filter({ hasText: 'New chat' }).first().locator('button', { hasText: /^Chat$/ }).first();
  await asideChat.click();
  await p.waitForTimeout(500);
  await p.locator('textarea').first().fill('Hello from sidebar mode');
  api.length = 0;
  await p.getByRole('button', { name: /^Start$/ }).first().click();
  await p.waitForTimeout(5000);
  console.log('1) sidebar Chat clicked -> apiMode =', api[api.length - 1] && api[api.length - 1].mode);

  // CASE 2: click Chat in the CopilotHOME pill row (inside <section>)
  await freshHome();
  const homeChat = p.locator('section button', { hasText: /^Chat$/ }).first();
  await homeChat.click();
  await p.waitForTimeout(500);
  await p.locator('textarea').first().fill('Hello from home pill');
  api.length = 0;
  await p.getByRole('button', { name: /^Start$/ }).first().click();
  await p.waitForTimeout(5000);
  console.log('2) CopilotHome pill Chat clicked -> apiMode =', api[api.length - 1] && api[api.length - 1].mode);

  // CASE 3: sidebar Analyze (default) then home pill Chat
  await freshHome();
  await p.locator('section button', { hasText: /^Launch$/ }).first().click();
  await p.waitForTimeout(500);
  await p.locator('textarea').first().fill('Launch question');
  api.length = 0;
  await p.getByRole('button', { name: /^Start$/ }).first().click();
  await p.waitForTimeout(5000);
  console.log('3) CopilotHome pill Launch clicked -> apiMode =', api[api.length - 1] && api[api.length - 1].mode);

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
