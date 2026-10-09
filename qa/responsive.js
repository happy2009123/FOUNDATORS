// FOUNDATORS QA — Phase 5: responsive layout QA across 10 viewports.
// For each viewport x key route: horizontal overflow, nav-mode
// (sidebar vs bottom-nav at the lg/1024px breakpoint), screenshots.
// Usage: node qa/responsive.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const pass = 'Test1234!';
const stamp = Date.now();
const U = { email: `resp.${stamp}@qa.test`, pass, name: 'Resp Tester' };

const VIEWPORTS = [
  { w: 360, h: 800, label: '360x800 (small phone)' },
  { w: 390, h: 844, label: '390x844 (iPhone 14)' },
  { w: 430, h: 932, label: '430x932 (iPhone 15 Pro Max)' },
  { w: 768, h: 1024, label: '768x1024 (iPad portrait)' },
  { w: 820, h: 1180, label: '820x1180 (iPad Air)' },
  { w: 1024, h: 768, label: '1024x768 (iPad landscape / lg)' },
  { w: 1280, h: 720, label: '1280x720 (laptop)' },
  { w: 1366, h: 768, label: '1366x768 (laptop)' },
  { w: 1440, h: 900, label: '1440x900 (desktop)' },
  { w: 1920, h: 1080, label: '1920x1080 (full HD)' },
];

const RESULTS = [];
const fs = require('fs');
const path = require('path');
const SHOT_DIR = path.join(__dirname, 'screenshots', 'responsive');
fs.mkdirSync(SHOT_DIR, { recursive: true });

function rec(id, name, status, detail) {
  const r = { id, name, status, detail };
  RESULTS.push(r);
  console.log(`  ${id} ${status} ${name} — ${detail}`);
}

async function dismissCookies(page) {
  try {
    const btn = page.locator('button', { hasText: /accept|agree|got it|okay/i }).first();
    if (await btn.isVisible({ timeout: 800 })) await btn.click({ timeout: 1500 });
  } catch (e) { /* no banner */ }
}

async function signup(page) {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await dismissCookies(page);
  await page.locator('input[aria-label="Full name"]').fill(U.name);
  await page.locator('input[aria-label="Email address"]').fill(U.email);
  await page.locator('input[aria-label="Password"]').first().fill(U.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await dismissCookies(page);
}

async function measure(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = Math.max(
      document.documentElement.scrollWidth,
      document.body ? document.body.scrollWidth : 0
    );
    const offenders = [];
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > vw + 1 && b.x >= -1) {
        if (offenders.length < 4) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 60),
            right: Math.round(b.right),
            w: Math.round(b.width),
          });
        }
      }
    });
    const bottomNav = document.querySelector('nav[aria-label="Main navigation"]');
    const nb = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const bottomNavVisible = !!(nb && nb.height > 0 && nb.width > 0 && nb.top < window.innerHeight);
    let sidebarVisible = false;
    document.querySelectorAll('aside').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.x < 5 && b.height > 100) sidebarVisible = true;
    });
    return { vw, doc, overflow: doc > vw + 1, offenders, bottomNavVisible, sidebarVisible };
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!/401|Failed to load resource/.test(t)) consoleErrors.push(t.slice(0, 200));
    }
  });

  console.log('== setup ==');
  await signup(page);
  const uid = await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('foundators-storage') || '{}');
      return s?.state?.profile?.id || null;
    } catch (e) { return null; }
  });

  // Auth-required app routes (sidebar/bottom-nav assertions apply).
  const AUTH_ROUTES = [
    ['home', '/home'],
    ['create', '/create'],
    ['messages', '/messages'],
    ['search', '/search'],
    ['settings', '/settings'],
    ['profile', uid ? `/profile/${uid}` : '/home'],
    ['notifications', '/notifications'],
  ];
  const PUBLIC_ROUTES = [
    ['login', '/login'],
    ['signup', '/signup'],
    ['root', '/'],
  ];

  console.log('== per-viewport audit ==');
  let vpIndex = 0;
  for (const vp of VIEWPORTS) {
    vpIndex++;
    const id = `R${String(vpIndex).padStart(2, '0')}`;
    await page.setViewportSize({ width: vp.w, height: vp.h });
    const expectSidebar = vp.w >= 1024;
    const issues = [];
    let overflowCount = 0;

    for (const [label, route] of [...AUTH_ROUTES, ...PUBLIC_ROUTES]) {
      const isAuthRoute = AUTH_ROUTES.some(([l]) => l === label);
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1700);
      await dismissCookies(page);
      const m = await measure(page);
      const shot = path.join(SHOT_DIR, `${vp.w}x${vp.h}-${label}.png`);
      await page.screenshot({ path: shot, fullPage: false });

      if (m.overflow) {
        overflowCount++;
        issues.push(`${route} overflow(${m.doc}>${m.vw}; ${m.offenders.map((o) => o.tag + '.' + o.cls.slice(0, 25)).join(', ')})`);
      }
      if (isAuthRoute) {
        if (expectSidebar && !m.sidebarVisible) issues.push(`${route} sidebar missing at ${vp.w}px`);
        if (!expectSidebar && m.sidebarVisible) issues.push(`${route} sidebar visible at mobile ${vp.w}px`);
        if (expectSidebar && m.bottomNavVisible) issues.push(`${route} bottom nav visible at desktop ${vp.w}px`);
        if (!expectSidebar && !m.bottomNavVisible) issues.push(`${route} bottom nav missing at mobile ${vp.w}px`);
      }
    }

    if (issues.length === 0) {
      rec(id, vp.label, 'PASS', `no overflow, nav mode correct (sidebar=${expectSidebar}), 10 shots`);
    } else if (overflowCount > 0) {
      rec(id, vp.label, 'FAIL', `${overflowCount} route(s) overflow — ` + issues.slice(0, 3).join(' | '));
    } else {
      rec(id, vp.label, 'FAIL', issues.slice(0, 3).join(' | '));
    }
  }

  const out = {
    ts: new Date().toISOString(),
    viewports: VIEWPORTS.map((v) => v.label),
    results: RESULTS,
    consoleErrors: [...new Set(consoleErrors)],
  };
  fs.writeFileSync(path.join(__dirname, 'results', 'responsive.json'), JSON.stringify(out, null, 2));
  const fails = RESULTS.filter((r) => r.status === 'FAIL');
  console.log(`\n== RESPONSIVE DONE: ${RESULTS.length - fails.length} pass, ${fails.length} fail ==`);
  fails.forEach((f) => console.log(`  FAIL ${f.id} ${f.name}: ${f.detail}`));
  if (consoleErrors.length) {
    console.log('  console errors: ' + [...new Set(consoleErrors)].join(' || ').slice(0, 400));
  }
  await browser.close();
  process.exit(fails.length > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
