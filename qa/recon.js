// QA recon: signs up two test users and dumps the real UI structure of key
// routes so the E2E suite can use accurate selectors. Local-only (emulators).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://localhost:3100';
const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  '/home', '/explore', '/search', '/notifications', '/messages', '/invite',
  '/settings', '/settings/edit-profile', '/settings/account',
  '/settings/privacy', '/settings/notifications', '/settings/blocked',
  '/create', '/projects', '/projects/new', '/collab-requests', '/copilot',
  '/voice', '/challenges', '/events', '/ideas', '/discussion', '/bookmarks',
  '/reels', '/admin', '/stories/create', '/onboarding', '/help', '/privacy',
  '/terms', '/founding-100', '/discover', '/match', '/list/joined',
];

async function dumpPage(page, route) {
  const before = page.url();
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1800);
  } catch (e) {
    return { route, error: e.message.slice(0, 200) };
  }
  const info = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, input, textarea, select, a[href]')];
    const seen = new Set();
    const items = [];
    for (const el of els) {
      const label = (
        el.getAttribute('aria-label') ||
        el.placeholder ||
        (el.innerText || '') ||
        (el.value && typeof el.value === 'string' ? el.value : '')
      ).replace(/\s+/g, ' ').trim().slice(0, 70);
      const key = el.tagName + '|' + label + '|' + (el.getAttribute('href') || '');
      if (!label || seen.has(key)) continue;
      seen.add(key);
      items.push({ t: el.tagName.toLowerCase(), label, href: el.getAttribute('href') });
      if (items.length >= 45) break;
    }
    return {
      url: location.pathname,
      title: document.title,
      h1: (document.querySelector('h1')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      items,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    };
  });
  return { route, ...info };
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror@${page.url()}: ${e.message.slice(0, 160)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console@${page.url()}: ${m.text().slice(0, 160)}`);
  });

  const stamp = Date.now();
  // --- signup A (wait for hydration: pre-hydration the form state is empty) ---
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByLabel('Full name').fill('Alice QA');
  await page.getByLabel('Email address').fill(`alice.qa${stamp}@example.com`);
  await page.getByLabel('Password', { exact: false }).first().fill('Test1234!');
  await page.getByLabel('Confirm password').fill('Test1234!');
  await page.getByRole('button', { name: /Create Account/ }).click();
  try {
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 25000 });
  } catch {
    errors.push('signup A did not navigate; url=' + page.url());
  }
  await page.waitForTimeout(2500);
  const alice = await page.evaluate(() => ({
    url: location.pathname,
    storage: { ...localStorage },
  }));
  fs.writeFileSync(path.join(OUT, 'recon-alice.json'), JSON.stringify(alice, null, 2));

  const pages = [];
  for (const r of ROUTES) pages.push(await dumpPage(page, r));
  fs.writeFileSync(path.join(OUT, 'recon.json'), JSON.stringify({ pages, errors }, null, 2));
  console.log('pages dumped:', pages.length, 'errors:', errors.length);
  console.log('alice landing:', alice.url);
  for (const e of errors.slice(0, 20)) console.log('ERR', e);
  await browser.close();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
