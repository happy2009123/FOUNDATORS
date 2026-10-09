// FOUNDATORS QA — Phase 8: black-box performance audit (dev-mode, local).
// Measures per route: TTFB, FCP, DCL, load, resource count, transfer size.
// Numbers are dev-server indicative (unbundled) — compare routes, not prod SLOs.
// Usage: node qa/perf.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const U = { email: `perf.${stamp}@qa.test`, pass: 'Test1234!', name: 'Perf Tester' };

const ROUTES = [
  ['/', '/'],
  ['/login', '/login'],
  ['/signup', '/signup'],
  ['/home', '/home'],
  ['/create', '/create'],
  ['/messages', '/messages'],
  ['/search', '/search'],
  ['/settings', '/settings'],
  ['/notifications', '/notifications'],
];

async function dismissCookies(page) {
  try {
    const btn = page.locator('button', { hasText: /accept|agree|got it|okay/i }).first();
    if (await btn.isVisible({ timeout: 600 })) await btn.click({ timeout: 1200 });
  } catch (e) { /* no banner */ }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  // sign up for auth'd routes
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await dismissCookies(page);
  await page.locator('input[aria-label="Full name"]').fill(U.name);
  await page.locator('input[aria-label="Email address"]').fill(U.email);
  await page.locator('input[aria-label="Password"]').first().fill(U.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(1500);

  const rows = [];
  const REPEATS = 3;

  for (const [label, route] of ROUTES) {
    const runs = [];
    for (let i = 0; i < REPEATS; i++) {
      // hard reload each time (cache disabled) to get consistent cold loads
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((p) => p.name === 'first-contentful-paint');
        const res = performance.getEntriesByType('resource');
        let transfer = 0;
        let jsCount = 0, jsTransfer = 0, imgCount = 0, cssCount = 0;
        res.forEach((r) => {
          const t = r.transferSize || r.encodedBodySize || 0;
          transfer += t;
          const ty = (r.initiatorType || '');
          if (ty === 'script') { jsCount++; jsTransfer += t; }
          if (ty === 'img' || ty === 'image') imgCount++;
          if (ty === 'link' || ty === 'css') cssCount++;
        });
        return {
          ttfb: Math.round(nav.responseStart || 0),
          dcl: Math.round(nav.domContentLoadedEventEnd || 0),
          load: Math.round(nav.loadEventEnd || 0),
          fcp: fcp ? Math.round(fcp.startTime) : null,
          resources: res.length,
          transferKB: Math.round(transfer / 1024),
          jsCount, jsKB: Math.round(jsTransfer / 1024), imgCount, cssCount,
        };
      });
      runs.push(m);
    }
    const med = (key) => {
      const v = runs.map((r) => r[key]).filter((x) => x != null).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : null;
    };
    rows.push({
      route: label,
      ttfb: med('ttfb'), fcp: med('fcp'), dcl: med('dcl'), load: med('load'),
      resources: med('resources'), transferKB: med('transferKB'),
      jsCount: med('jsCount'), jsKB: med('jsKB'), imgCount: med('imgCount'),
    });
    const r = rows[rows.length - 1];
    console.log(
      `  ${label.padEnd(16)} ttfb=${String(r.ttfb).padStart(4)}ms fcp=${String(r.fcp).padStart(4)}ms ` +
      `dcl=${String(r.dcl).padStart(5)}ms load=${String(r.load).padStart(5)}ms ` +
      `res=${String(r.resources).padStart(3)} (${r.jsKB}KB js/${r.jsCount}f) transfer=${r.transferKB}KB`
    );
  }

  const out = { ts: new Date().toISOString(), mode: 'next-dev local', repeats: REPEATS, rows };
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results', 'perf.json'), JSON.stringify(out, null, 2));

  console.log('\n== PERF thresholds (dev-mode indicative) ==');
  let fail = 0;
  rows.forEach((r) => {
    const probs = [];
    if (r.ttfb > 1000) probs.push(`TTFB ${r.ttfb}ms > 1000`);
    if (r.fcp > 3000) probs.push(`FCP ${r.fcp}ms > 3000`);
    if (r.load > 8000) probs.push(`load ${r.load}ms > 8000`);
    if (r.resources > 120) probs.push(`resources ${r.resources} > 120`);
    if (r.transferKB > 3000) probs.push(`transfer ${r.transferKB}KB > 3000`);
    if (probs.length) { fail++; console.log(`  WARN ${r.route}: ${probs.join(', ')}`); }
  });
  console.log(`== PERF DONE: ${rows.length} routes, ${fail} flagged ==`);
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
