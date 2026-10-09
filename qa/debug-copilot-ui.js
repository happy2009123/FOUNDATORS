// Verify each mode switches correctly and renders the right bubble type.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `copilot.ui2.${stamp}@qa.test`, pass: 'Test1234!', name: 'Copilot UI2' };

async function signup(p) {
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const api = [];
  p.on('response', async (r) => {
    if (r.url().includes('/api/copilot')) {
      let b = null; try { b = await r.json(); } catch (e) {}
      api.push({ status: r.status(), mode: b && b.mode, source: b && b.source, dataType: b && b.data && typeof b.data === 'object' ? 'object' : typeof b.data });
    }
  });
  await signup(p);

  const cases = [
    ['Analyze Idea', 'analyze', 'A marketplace for indie founders to swap skills', 'analysis card'],
    ['Validate', 'validate', 'Validate a newsletter for indie founders', 'validation card'],
    ['Plan MVP', 'mvp', 'A simple habit tracker for remote teams', 'mvp card'],
    ['Launch', 'launch', 'Launching a designer community next month', 'launch card'],
    ['Chat', 'chat', 'Hello, what should I do first?', 'plain text'],
  ];

  for (const [label, expectMode, text, expectKind] of cases) {
    api.length = 0;
    await p.goto(BASE + '/copilot', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    // Click the mode pill in CopilotHome by exact accessible name
    const pill = p.getByRole('button', { name: label, exact: true }).first();
    await pill.waitFor({ state: 'visible', timeout: 8000 });
    await pill.click();
    await p.waitForTimeout(500);
    await p.locator('textarea').first().fill(text);
    const startBtn = p.getByRole('button', { name: /^Start$/ }).first();
    await startBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startBtn.click({ force: true });
    await p.waitForTimeout(6000);

    const bubbles = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('.space-y-4 > div')) {
        const t = (el.innerText || '').trim();
        if (/Copilot/i.test(t)) out.push(t);
      }
      return out;
    });
    const b = bubbles[bubbles.length - 1] || '(none)';
    const isCard = /IDEA ANALYSIS|VALIDATION PLAN|MVP ROADMAP|LAUNCH CHECKLIST|BUILd WITH ME/i.test(b);
    const empty = b.replace(/^Copilot\s*/i, '').trim().length < 5;
    const a = api[api.length - 1] || {};
    const modeOK = a.mode === expectMode;
    const kindOK = expectKind === 'plain text' ? !isCard : isCard;
    console.log(`${label.padEnd(13)} apiMode=${String(a.mode).padEnd(9)} src=${String(a.source).padEnd(9)} card=${isCard ? 'Y' : 'N'} empty=${empty} modeOK=${modeOK} kindOK=${kindOK}`);
    if (!modeOK || !kindOK || empty) console.log('    bubble: ' + JSON.stringify(b.slice(0, 220)));
  }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
