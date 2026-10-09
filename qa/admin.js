// FOUNDATORS QA — Phase 4b: admin console positive-path E2E.
// 1) fresh user is denied /admin (guard + rules)
// 2) seed admins/{uid} via the emulator's owner REST (local ONLY)
// 3) guard flips live (onSnapshot) and every /admin route smokes clean
// 4) admin CAN read reports + pendingNotifications (contrast X20/X21)
// 5) cleanup: delete the seeded admin doc
// Usage: node qa/admin.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const EMU_FS = 'http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const pass = 'Test1234!';
const stamp = Date.now();
const U = { email: `adm.${stamp}@qa.test`, pass, name: 'Admin Tester' };

const ADMIN_ROUTES = [
  '/admin', '/admin/analytics', '/admin/build-with-me', '/admin/clear',
  '/admin/communities', '/admin/founding', '/admin/growth', '/admin/messages',
  '/admin/moderation', '/admin/posts', '/admin/projects', '/admin/reports',
  '/admin/settings', '/admin/users', '/admin/voice',
];

const RESULTS = [];
function rec(id, name, status, detail) {
  RESULTS.push({ id, name, status, detail });
  console.log(`  ${id} ${status} ${name} — ${detail}`);
}

async function rest(path, body) {
  return fetch(`${IDB}/${path}?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json());
}

// Owner-token writes bypass rules ONLY on the local emulator — this script
// must never run against production (guard below).
async function seedAdmin(uid, on) {
  if (on) {
    const url = `${EMU_FS}/admins/${uid}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { role: { stringValue: 'admin' }, seededByQa: { booleanValue: true } } }),
    });
    if (!res.ok) throw new Error(`seed failed: ${res.status} ${await res.text()}`);
  } else {
    const res = await fetch(`${EMU_FS}/admins/${uid}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer owner' },
    });
    if (!res.ok) throw new Error(`cleanup failed: ${res.status}`);
  }
}

(async () => {
  // safety: owner token only works on the emulator — prove it
  const probe = await fetch(`${EMU_FS}/admins/qa-probe-check`, {
    method: 'GET', headers: { Authorization: 'Bearer owner' },
  }).catch(() => null);
  if (!probe) { console.error('emulator unreachable — refusing to run'); process.exit(2); }
  if (probe.status !== 404 && probe.status !== 200) {
    console.error(`emulator responded ${probe.status} — refusing to run`); process.exit(2);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!/401|Failed to load resource/.test(t)) consoleErrors.push(t.slice(0, 220));
    }
  });

  console.log('== setup ==');
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  try {
    const btn = page.locator('button', { hasText: /accept|agree|got it|okay/i }).first();
    if (await btn.isVisible({ timeout: 800 })) await btn.click({ timeout: 1500 });
  } catch (e) { /* no banner */ }
  await page.locator('input[aria-label="Full name"]').fill(U.name);
  await page.locator('input[aria-label="Email address"]').fill(U.email);
  await page.locator('input[aria-label="Password"]').first().fill(U.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(1800);

  const s = await rest('accounts:signInWithPassword', { email: U.email, password: U.pass, returnSecureToken: true });
  const uid = s.localId;
  console.log('admin candidate uid:', uid);

  // A1: normal user denied (rules + guard)
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  let body = await page.locator('body').innerText();
  if (!/Access denied/i.test(body)) {
    rec('A01', 'normal user denied /admin', 'FAIL', 'no Access denied screen');
  } else {
    rec('A01', 'normal user denied /admin', 'PASS', 'denied screen shown');
  }

  // A2: seed + guard flips live
  await seedAdmin(uid, true);
  await page.waitForTimeout(3000);
  body = await page.locator('body').innerText();
  if (/Access denied/i.test(body)) {
    // full reload in case the snapshot raced the seeding
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    body = await page.locator('body').innerText();
  }
  if (/Access denied/i.test(body)) {
    rec('A02', 'seeded admin gains access', 'FAIL', 'still denied after seeding admins/' + uid.slice(0, 8));
  } else {
    rec('A02', 'seeded admin gains access', 'PASS', 'guard accepted live admin doc');
  }

  // A3: every admin route smokes clean (poll until the guard finishes)
  const routeIssues = [];
  for (const route of ADMIN_ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => !/Verifying admin access/i.test(document.body.innerText || ''),
      { timeout: 10000 }
    ).catch(() => {});
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => {
      const t = document.body.innerText || '';
      return {
        text: t.slice(0, 4000),
        len: t.length,
        url: location.pathname,
        appError: /Application error|This page could not be loaded|500 -|Internal Server Error/i.test(t),
      };
    });
    const label = route.replace('/admin', 'admin') || 'admin';
    if (st.appError) routeIssues.push(`${route}: app error`);
    else if (/Access denied/i.test(st.text)) routeIssues.push(`${route}: unexpectedly denied`);
    else if (/Verifying admin access/i.test(st.text)) routeIssues.push(`${route}: stuck on loading guard`);
    else if (st.len < 60) routeIssues.push(`${route}: near-empty body (${st.len} chars)`);
    if (!st.url.startsWith('/admin')) routeIssues.push(`${route}: redirected to ${st.url}`);
    await page.screenshot({ path: `qa/screenshots/admin-${route.replace(/\//g, '_')}.png` }).catch(() => {});
  }
  if (routeIssues.length) rec('A03', 'all admin routes smoke', 'FAIL', routeIssues.join(' | ').slice(0, 500));
  else rec('A03', 'all admin routes smoke', 'PASS', `${ADMIN_ROUTES.length} routes, no error/denied/empty`);

  // A4: admin reads privileged collections (contrast X20/X21 which denied normal users)
  const readRes = {};
  {
    const { initializeApp, getApps } = require('firebase/app');
    const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
    const { getFirestore, connectFirestoreEmulator, collection, getDocs, limit, query } = require('firebase/firestore');
    const app = getApps().length ? getApps()[0] : initializeApp({
      apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
      storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
      appId: '1:895663747948:web:e5220d538c767f34ec3949',
    });
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, 'localhost', 8080);
    await signInWithEmailAndPassword(auth, U.email, U.pass);
    const { doc, getDoc } = require('firebase/firestore');
    try {
      const own = await getDoc(doc(db, 'admins', uid));
      readRes['admins/{uid} (get own)'] = own.exists() ? 'exists (role=' + own.data().role + ')' : 'MISSING';
    } catch (e) { readRes['admins/{uid} (get own)'] = 'ERR ' + (e.code || e.message || '').toString().slice(0, 60); }
    for (const col of ['reports', 'pending-notifications']) {
      try {
        const snap = await getDocs(query(collection(db, col), limit(5)));
        readRes[col] = snap.size + ' docs';
      } catch (e) { readRes[col] = 'ERR ' + (e.code || e.message || '').toString().slice(0, 60); }
    }
  }
  const denied = Object.entries(readRes).filter(([k, v]) => /ERR|denied|MISSING/.test(v));
  if (denied.length) rec('A04', 'admin reads privileged collections', 'FAIL', JSON.stringify(readRes));
  else rec('A04', 'admin reads privileged collections', 'PASS', JSON.stringify(readRes));

  // cleanup
  await seedAdmin(uid, false);
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  body = await page.locator('body').innerText();
  rec('A05', 'access revoked after cleanup', /Access denied/i.test(body) ? 'PASS' : 'FAIL',
    /Access denied/i.test(body) ? 'denied again after doc removal' : 'STILL HAS ACCESS');

  const out = { ts: new Date().toISOString(), uid, results: RESULTS, consoleErrors: [...new Set(consoleErrors)] };
  require('fs').writeFileSync('qa/results/admin.json', JSON.stringify(out, null, 2));
  const fails = RESULTS.filter((r) => r.status === 'FAIL');
  console.log(`\n== ADMIN E2E DONE: ${RESULTS.length - fails.length} pass, ${fails.length} fail ==`);
  fails.forEach((f) => console.log(`  FAIL ${f.id} ${f.name}: ${f.detail}`));
  if (consoleErrors.length) console.log('  console: ' + [...new Set(consoleErrors)].join(' || ').slice(0, 500));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
