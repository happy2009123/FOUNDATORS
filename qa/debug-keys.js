// Evidence: P3-A — locate the component behind React's
// "Encountered two children with the same key" warning by capturing
// console.error stacks on the dev (unminified) build.
// Reproduces the responsive-run conditions: mobile viewport first,
// includes the post-signup landing (onboarding) page.
// Usage: node qa/debug-keys.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const stamp = Date.now();

const LOGGED_OUT_PAGES = ['/', '/login', '/signup'];
const LOGGED_IN_PAGES = ['/', '/home', '/create', '/settings', '/messages', '/search', '/notifications', '/explore'];
const VIEWPORTS = [
  { w: 390, h: 844 },   // matches the responsive run that caught the warning
  { w: 1280, h: 800 },
];

(async () => {
  const browser = await chromium.launch();
  const hits = {};
  let userSeq = 0;

  async function probePages(page, list, tag) {
    for (const route of list) {
      const key = `${tag}${route}`;
      // init script re-creates __keyWarnings on every navigation; just make
      // sure an evaluate before the first goto cannot crash.
      await page.evaluate(() => { window.__keyWarnings = window.__keyWarnings || []; });
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.evaluate(async () => {
        for (let y = 0; y < 6; y += 1) {
          window.scrollBy(0, window.innerHeight);
          await new Promise((r) => setTimeout(r, 300));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
      const warns = await page.evaluate(() => window.__keyWarnings.map((w) => ({
        msg: w.msg,
        frames: String(w.stack || '')
          .split('\n')
          .filter((l) => l.includes('(') || l.includes('at '))
          .slice(1, 26),
      })));
      if (warns.length) {
        hits[key] = warns;
        console.log(`\n== ${key}: ${warns.length} key warning(s) ==`);
        warns.forEach((w, i) => {
          console.log(` [${i}] ${w.msg}`);
          w.frames.forEach((f) => console.log('     ' + f.trim().slice(0, 220)));
        });
      } else {
        console.log(`${key}: clean`);
      }
    }
  }

  for (const vp of VIEWPORTS) {
    const tag = `[${vp.w}x${vp.h}] `;
    console.log(`\n==== viewport ${vp.w}x${vp.h} ====`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__keyWarnings = [];
      const orig = console.error;
      console.error = function (...args) {
        try {
          const msg = String(args[0] === undefined ? '' : args[0]);
          if (/same key|duplicate/i.test(msg)) {
            window.__keyWarnings.push({
              msg: msg.slice(0, 180),
              stack: (new Error('keywarn')).stack,
            });
          }
        } catch (e) { /* ignore */ }
        return orig.apply(console, args);
      };
    });

    console.log('-- logged out --');
    await probePages(page, LOGGED_OUT_PAGES, tag);

    userSeq += 1;
    const email = `keys${userSeq}.${stamp}@qa.test`;
    await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.locator('input[aria-label="Full name"]').fill(`Key Probe ${userSeq}`);
    await page.locator('input[aria-label="Email address"]').fill(email);
    await page.locator('input[aria-label="Password"]').first().fill('Test1234!');
    await page.locator('input[aria-label="Confirm password"]').fill('Test1234!');
    await page.getByRole('button', { name: /Create Account/ }).click();
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
    await page.waitForTimeout(2500);

    // probe the post-signup landing page itself (onboarding wizard)
    const landing = new URL(page.url()).pathname;
    console.log(`-- post-signup landing: ${landing} --`);
    await probePages(page, [landing], tag);

    console.log('-- logged in --');
    await probePages(page, LOGGED_IN_PAGES, tag);
    await ctx.close();
  }

  const out = { ts: new Date().toISOString(), hits };
  require('fs').writeFileSync('qa/results/key-warnings.json', JSON.stringify(out, null, 2));
  console.log('\nhit routes:', Object.keys(hits).length ? Object.keys(hits).join(', ') : 'NONE');
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
