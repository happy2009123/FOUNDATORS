// qa/routes.js — full-route health + accessibility + internal-link sweep.
// Persona A: anonymous (public/protected route behavior).
// Persona B: fresh signup → visits every static route + seeded dynamic routes.
// Per route: HTTP status, final URL (redirects), not-found marker, body length,
// console/page errors, a11y checks (labels/names/alt/dup-ids/title/lang), link harvest.
// Phase 2: status-check every unique internal link discovered.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = 'http://localhost:3100';
const stamp = Date.now();
const USER = { email: `rt.${stamp}@qa.test`, pass: 'Test1234!', name: 'Route Probe' };
const OUT = path.join(__dirname, 'results');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const NOT_FOUND_RE = /this page could not be found|404\b/i;
const IGNORE_CONSOLE = [/\/api\/email/, /Download the React DevTools/i, /FirebaseError: Firebase/i, /WebChannel/i, /performance/, /\[HMR\]/];

const ROUTES = [
  '/home', '/explore', '/discover', '/reels', '/search', '/notifications', '/bookmarks',
  '/bookmarks/collections', '/messages', '/messages/create-group', '/create',
  '/drafts', '/ideas', '/opportunities', '/programmers', '/projects', '/projects/new',
  '/startup', '/events', '/challenges', '/collab-requests', '/match', '/voice', '/voice/create',
  '/copilot', '/ai', '/analytics', '/founding-100', '/invite', '/help', '/list/people',
  '/list/startups', '/list/discussions', '/settings', '/settings/account', '/settings/blocked',
  '/settings/edit-profile', '/settings/notifications', '/settings/privacy', '/profile',
  '/gestures', '/gestures/trending', '/gestures/community', '/gestures/collab',
  '/gestures/creator', '/gestures/editor', '/gestures/create', '/terms', '/privacy',
  '/onboarding', '/login', '/signup', '/forgot-password', '/discussion',
];
const ANON_ROUTES = ['/login', '/signup', '/forgot-password', '/terms', '/privacy', '/help', '/home', '/explore'];

async function signUp(p) {
  await p.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input[aria-label="Full name"]').fill(USER.name);
  await p.locator('input[aria-label="Email address"]').fill(USER.email);
  await p.locator('input[aria-label="Password"]').first().fill(USER.pass);
  await p.locator('input[aria-label="Confirm password"]').fill(USER.pass);
  await p.getByRole('button', { name: /Create Account/ }).click();
  await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await p.waitForTimeout(2000);
}

async function getUid() {
  const res = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER.email, password: USER.pass, returnSecureToken: true }),
  });
  const j = await res.json();
  return j.localId;
}

async function seedPost(uid) {
  const id = 'rt-post-' + stamp;
  const fields = {
    text: { stringValue: 'Route probe post for detail-page health check.' },
    authorKey: { stringValue: uid }, authorName: { stringValue: USER.name }, authorAvatar: { stringValue: '' },
    tagType: { stringValue: 'idea' }, imageUrl: { stringValue: '' },
    likes: { integerValue: '0' }, shares: { integerValue: '0' }, commentsCount: { integerValue: '0' },
    likedBy: { arrayValue: {} }, bookmarkedBy: { arrayValue: {} },
    createdAt: { timestampValue: new Date().toISOString() },
  };
  const res = await fetch(`http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/posts?documentId=${id}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`seed post failed: ${res.status} ${await res.text()}`);
  return id;
}

function a11yEval() {
  const issues = { inputsNoLabel: [], buttonsNoName: [], linksNoName: [], imgsNoAlt: [], dupIds: [] };
  for (const el of document.querySelectorAll('input, textarea, select')) {
    const hasLabel = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('placeholder') ||
      el.getAttribute('title') || el.closest('label'));
    if (!hasLabel) issues.inputsNoLabel.push((el.type || el.tagName) + (el.id ? '#' + el.id : ''));
  }
  for (const el of document.querySelectorAll('button, a[href]')) {
    const name = (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (!name && el.offsetParent !== null) {
      (el.tagName === 'A' ? issues.linksNoName : issues.buttonsNoName).push((el.tagName === 'A' ? el.getAttribute('href') : 'btn') || el.tagName);
    }
  }
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) issues.imgsNoAlt.push(img.src.slice(-60));
  const seen = {};
  for (const el of document.querySelectorAll('[id]')) { seen[el.id] = (seen[el.id] || 0) + 1; }
  issues.dupIds = Object.entries(seen).filter(([, n]) => n > 1).map(([id, n]) => id + 'x' + n);
  return issues;
}

async function visit(p, route, tag, recs) {
  const rec = { tag, route, status: 0, final: '', notFound: false, textLen: 0, errors: [], a11y: null, redirected: false };
  const errs = [];
  const onErr = (m) => {
    const t = typeof m.text === 'function' ? m.text() : String(m);
    if (!IGNORE_CONSOLE.some((r) => r.test(t))) errs.push(t.replace(/\s+/g, ' ').slice(0, 200));
  };
  const onPageErr = (e) => errs.push('PAGEERROR ' + String(e).slice(0, 200));
  p.on('console', onErr); p.on('pageerror', onPageErr);
  try {
    const resp = await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    rec.status = resp ? resp.status() : 0;
    await p.waitForTimeout(1800);
    rec.final = p.url().replace(BASE, '');
    rec.redirected = rec.final !== route && rec.final !== route + '/';
    const body = await p.locator('body').innerText().catch(() => '');
    rec.textLen = body.length;
    rec.notFound = NOT_FOUND_RE.test(body.slice(0, 3000)) || rec.status >= 400;
    if (!rec.notFound) {
      rec.a11y = await p.evaluate(a11yEval);
      const hrefs = await p.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')));
      for (const h of hrefs) recs.links.add(h.split('#')[0].split('?')[0]);
      rec.linkCount = hrefs.length;
    }
  } catch (e) {
    rec.errors.push('NAV ' + String(e.message).slice(0, 160));
  }
  rec.errors = [...new Set([...rec.errors, ...errs])];
  p.off('console', onErr); p.off('pageerror', onPageErr);
  recs.rows.push(rec);
  const flag = rec.notFound || rec.errors.length ? ' !!' : '';
  process.stdout.write(`  [${tag}] ${route} -> ${rec.status} ${rec.final}${flag}\n`);
}

(async () => {
  const browser = await chromium.launch();
  const recs = { rows: [], links: new Set() };

  // Phase A: anonymous
  const ctxAnon = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pAnon = await ctxAnon.newPage();
  for (const r of ANON_ROUTES) await visit(pAnon, r, 'anon', recs);
  await ctxAnon.close();

  // Phase B: signed-in full sweep
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await signUp(p);
  const uid = await getUid();
  const postId = await seedPost(uid);
  const dyn = [
    `/post/${postId}`, `/profile/${uid}`, `/match/discover`, `/discussion/rt-fake`,
    `/voice/founder/${uid}`, `/voice/room/rt-room`, `/projects/rt-fake`, `/startup/rt-fake`,
  ];
  for (const r of [...ROUTES, ...dyn]) await visit(p, r, 'auth', recs);

  // Phase 2: link status sweep
  const linkRows = [];
  const seen = [...recs.links].filter((h) => h && !h.startsWith('/api/') && !/\.[a-z0-9]{2,5}$/i.test(h));
  process.stdout.write(`\nchecking ${seen.length} unique internal links...\n`);
  for (const h of seen) {
    const r = { link: h, status: 0, notFound: false, final: '' };
    try {
      const resp = await p.goto(BASE + h, { waitUntil: 'domcontentloaded', timeout: 20000 });
      r.status = resp ? resp.status() : 0;
      await p.waitForTimeout(900);
      r.final = p.url().replace(BASE, '');
      const body = await p.locator('body').innerText().catch(() => '');
      r.notFound = NOT_FOUND_RE.test(body.slice(0, 2500)) || r.status >= 400;
    } catch (e) { r.status = -1; r.final = String(e.message).slice(0, 100); }
    linkRows.push(r);
    if (r.notFound) process.stdout.write(`  DEAD ${h} -> ${r.status} ${r.final}\n`);
  }
  await browser.close();

  const out = { at: new Date().toISOString(), user: USER.email, rows: recs.rows, links: linkRows };
  fs.writeFileSync(path.join(OUT, 'routes.json'), JSON.stringify(out, null, 2));

  const broken = recs.rows.filter((r) => r.notFound);
  const errRows = recs.rows.filter((r) => r.errors.length);
  const deadLinks = linkRows.filter((r) => r.notFound);
  const a11yCount = {};
  for (const r of recs.rows) if (r.a11y) for (const [k, v] of Object.entries(r.a11y)) if (v && v.length) a11yCount[k] = (a11yCount[k] || 0) + v.length;
  console.log('\n=== ROUTES SWEEP DONE ===');
  console.log(`routes: ${recs.rows.length} | broken(notFound/status>=400): ${broken.length} | routes with console/page errors: ${errRows.length}`);
  broken.forEach((r) => console.log(`  BROKEN [${r.tag}] ${r.route} -> ${r.status} ${r.final}`));
  errRows.forEach((r) => console.log(`  ERRORS ${r.route}: ${r.errors.slice(0, 3).join(' | ')}`));
  console.log(`a11y totals: ${JSON.stringify(a11yCount)}`);
  console.log(`links discovered: ${recs.links.size} | checked: ${linkRows.length} | dead: ${deadLinks.length}`);
  deadLinks.forEach((r) => console.log(`  DEAD LINK ${r.link} -> ${r.status} ${r.final}`));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
