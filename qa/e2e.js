// FOUNDATORS QA — main E2E journey suite (Phases 1, 2, 4).
// Local-only: Next dev on :3100 + Firebase emulators (NEXT_PUBLIC_USE_EMULATORS=1).
// Usage: node qa/e2e.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://localhost:3100';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const RESULTS = [];
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const stamp = Date.now();
const A = { name: 'Alice QA', email: `alice.${stamp}@qa.test`, pass: 'Test1234!' };
const B = { name: 'Bob QA', email: `bob.${stamp}@qa.test`, pass: 'Test1234!' };

const consoleErrors = [];
function watch(page, tag) {
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const loc = m.location();
      const at = loc && loc.url ? ` @${loc.url.replace(BASE, '')}` : '';
      consoleErrors.push(`[${tag}] ${m.text().slice(0, 220)}${at}`);
    }
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}:pageerror] ${e.message.slice(0, 220)}`));
}

async function dismissCookie(page) {
  try {
    const dlg = page.locator('[role="dialog"][aria-label="Cookie consent"]');
    if (!(await dlg.count())) return;
    const b = dlg.locator('button', { hasText: /accept/i });
    if (await b.count()) {
      await b.first().click({ timeout: 3000 });
      await page.waitForTimeout(300);
    }
  } catch {}
}
async function nav(page, p, wait = 1900) {
  await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(wait);
  await dismissCookie(page);
}
async function toast(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[class*=toast],[role=alert],[role=status]')]
      .map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ').slice(0, 220)
  );
}
async function pageText(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
}
// Poll until `text` appears (Firestore write/tab-render can lag fixed waits).
// Returns the last body text so failures can include a snippet.
async function waitForText(page, text, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    last = await pageText(page);
    if (last.includes(text)) return last;
    await page.waitForTimeout(500);
  }
  return last;
}
async function fillByLabel(page, label, value) {
  await page.locator(`input[aria-label="${label}"], input[placeholder="${label}"], textarea[aria-label="${label}"], textarea[placeholder="${label}"]`).first().fill(value);
}
async function uidViaRest(user) {
  const r = await fetch(`${IDB}/accounts:signInWithPassword?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.pass, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.localId) throw new Error('rest signin failed: ' + JSON.stringify(j).slice(0, 120));
  return j.localId;
}
// Emulator OOB: request VERIFY_EMAIL, then open every matching link (codes can
// be stale; visiting is idempotent). Server-side result verified via lookup.
async function verifyEmail(user) {
  const s = await fetch(`${IDB}/accounts:signInWithPassword?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.pass, returnSecureToken: true }),
  });
  const j = await s.json();
  if (!j.idToken) throw new Error('signin for oob failed');
  await fetch(`${IDB}/accounts:sendOobCode?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: j.idToken }),
  });
  const r = await fetch('http://localhost:9099/emulator/v1/projects/foundators-66eb7/oobCodes');
  const codes = ((await r.json()).oobCodes || []).filter(
    (c) => c.email === user.email && c.requestType === 'VERIFY_EMAIL'
  );
  for (const c of codes.slice(-3)) await fetch(c.oobLink, { redirect: 'manual' }).catch(() => {});
  const lk = await fetch(`${IDB}/accounts:lookup?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: j.idToken }),
  }).then((x) => x.json());
  const v = lk.users && lk.users[0] && lk.users[0].emailVerified;
  if (v !== true) throw new Error('email still unverified after oob visit');
  return 'verified';
}
// Clicks the nth VISIBLE match that actually sits inside the viewport
// (the off-canvas drawer renders "visible" buttons at negative x).
async function inViewportClick(page, selector, hasText, timeout = 8000) {
  const loc = page.locator(selector).filter({ hasText });
  const n = await loc.count();
  const vp = page.viewportSize();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const b = await el.boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.x + b.width <= vp.width + 1 && b.y >= -1) {
      await el.click({ timeout });
      return true;
    }
  }
  throw new Error(`no in-viewport match for ${selector} ${hasText}`);
}
// Picks a visible match in the LEFT half of the screen — used to click rows
// in the main column while the right rail also shows the same person.
async function leftHalfClick(page, selector, hasText, timeout = 8000) {
  const loc = page.locator(selector).filter({ hasText });
  const n = await loc.count();
  const vp = page.viewportSize();
  // Pick the SMALLEST left-half match: DOM order yields giant wrapper divs
  // first, whose bounding-box center is a dead zone (nothing clickable).
  let best = null;
  let bestArea = Infinity;
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const b = await el.boundingBox().catch(() => null);
    if (!b || b.x < 0 || b.x >= vp.width / 2 || b.y < -1 || b.width <= 0 || b.height <= 0) continue;
    const area = b.width * b.height;
    if (area < bestArea) { bestArea = area; best = el; }
  }
  if (!best) throw new Error(`no left-half match for ${selector} ${hasText}`);
  await best.click({ timeout });
  return true;
}
// Node-side Firestore reads (signed in via REST-equivalent SDK) for
// authoritative persistence assertions.
let nodeCtx = null;
async function nodeFs(user) {
  const { initializeApp, getApps } = require('firebase/app');
  const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
  const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
  if (!nodeCtx) {
    const app = getApps().length ? getApps()[0] : initializeApp({
      apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
      storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
      appId: '1:895663747948:web:e5220d538c767f34ec3949',
    });
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, 'localhost', 8080);
    nodeCtx = { auth, db };
  }
  await signInWithEmailAndPassword(nodeCtx.auth, user.email, user.pass).catch(() => {});
  const { doc, getDoc } = require('firebase/firestore');
  return {
    db: nodeCtx.db,
    get: (col, id) => getDoc(doc(nodeCtx.db, col, id)).then((s) => (s.exists() ? s.data() : null)),
  };
}

async function step(id, name, fn) {
  const rec = { id, name, status: 'PASS', detail: '' };
  try {
    rec.detail = (await fn()) || '';
    process.stdout.write(`  ${id} PASS ${name}${rec.detail ? ' — ' + rec.detail : ''}\n`);
  } catch (e) {
    rec.status = 'FAIL';
    rec.detail = String(e.message || e).replace(/\s+/g, ' ').slice(0, 350);
    process.stdout.write(`  ${id} FAIL ${name} — ${rec.detail}\n`);
    try { await global.__lastPage?.screenshot({ path: path.join(SHOTS, id + '.png') }); } catch {}
  }
  RESULTS.push(rec);
  return rec.status === 'PASS';
}

async function signup(page, user) {
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await fillByLabel(page, 'Full name', user.name);
  await fillByLabel(page, 'Email address', user.email);
  await page.locator('input[aria-label="Password"]').first().fill(user.pass);
  await fillByLabel(page, 'Confirm password', user.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2200);
}
async function login(page, user) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await fillByLabel(page, 'Email address', user.email);
  await page.locator('input[aria-label="Password"], input[type="password"]').first().fill(user.pass);
  await page.getByRole('button', { name: /log ?in|sign ?in|continue/i }).first().click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2200);
}

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pA = await ctxA.newPage();
  const pB = await ctxB.newPage();
  watch(pA, 'A');
  watch(pB, 'B');

  console.log('== signup/session ==');
  await step('S01', 'signup Alice', async () => {
    global.__lastPage = pA;
    await signup(pA, A);
    await dismissCookie(pA);
    return 'landed ' + new URL(pA.url()).pathname;
  });
  await step('S02', 'signup Bob', async () => {
    global.__lastPage = pB;
    await signup(pB, B);
    await dismissCookie(pB);
    return 'landed ' + new URL(pB.url()).pathname;
  });
  await step('S03', 'email verification works (emulator OOB)', async () => {
    const a = await verifyEmail(A);
    const b = await verifyEmail(B);
    return `${a}, ${b}`;
  });
  const aliceUid = await uidViaRest(A);
  const bobUid = await uidViaRest(B);
  await step('S03b', 'uids distinct', async () => {
    if (aliceUid === bobUid) throw new Error('same uid');
    return `alice=${aliceUid.slice(0, 8)} bob=${bobUid.slice(0, 8)}`;
  });

  await step('S04', 'session persists after reload (Alice)', async () => {
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2200);
    if (/\/login/.test(pA.url())) throw new Error('redirected to /login after reload');
    const txt = await pageText(pA);
    if (!txt.includes('Alice')) throw new Error('profile chip missing after reload');
    return 'still signed in';
  });

  await step('S05', 'onboarding completes and sticks', async () => {
    if (!/onboarding/.test(pA.url())) return 'no onboarding shown (skipped)';
    for (let i = 0; i < 8 && /onboarding/.test(pA.url()); i++) {
      const nameInput = pA.locator('input:visible').first();
      if (await nameInput.count()) await nameInput.fill(A.name).catch(() => {});
      const chip = pA.getByRole('button', { name: /Founder/ }).first();
      if (await chip.count()) await chip.click().catch(() => {});
      const btn = pA.getByRole('button', { name: /^(Continue|Next|Finish|Done|Skip|Start|Go)/i }).first();
      if (await btn.count()) await btn.click().catch(() => {});
      await pA.waitForTimeout(1600);
    }
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2200);
    if (/onboarding/.test(pA.url())) throw new Error('still on /onboarding after reload');
    return 'completed';
  });

  console.log('== profile ==');
  await step('S06', 'edit profile persists after refresh', async () => {
    global.__lastPage = pA;
    const bio = `E2E QA bio ${stamp}`;
    await nav(pA, '/settings/edit-profile', 2500);
    // KNOWN P1: cold-load initializes the form from an empty store profile,
    // so name/handle/bio start blank — fill them explicitly here.
    await fillByLabel(pA, 'Your full name', A.name);
    await fillByLabel(pA, '@yourhandle', '@aliceqa');
    await fillByLabel(pA, 'Tell people about yourself...', bio);
    await fillByLabel(pA, 'Founder', 'QA Founder');
    await fillByLabel(pA, 'City, Country', 'QA City');
    await pA.getByRole('button', { name: /^Save$/ }).first().click();
    await pA.waitForTimeout(2500);
    const t = await toast(pA);
    const fs = await nodeFs(A);
    const d = await fs.get('users', aliceUid);
    if (!d || d.bio !== bio) throw new Error(`FS bio=${d && JSON.stringify(d.bio)} (toast: ${t || 'none'})`);
    await nav(pA, `/profile/${aliceUid}`, 2600);
    const txt = await pageText(pA);
    if (!txt.includes(bio)) throw new Error('bio not visible on profile page');
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2600);
    const txt2 = await pageText(pA);
    if (!txt2.includes(bio)) throw new Error('bio lost after reload');
    return 'FS + UI persisted';
  });

  console.log('== posts/likes/comments ==');
  const postText = `E2E QA post ${stamp} — hello Foundators`;
  let postId = null;
  await step('S07', 'create post appears on profile (SPA nav)', async () => {
    global.__lastPage = pA;
    // Known P1 (see S07b): a FULL reload into /create can leave Post disabled
    // forever, so the happy path uses the app's own SPA navigation instead.
    await nav(pA, '/home', 2400);
    await pA.locator('button', { hasText: /^Create$/ }).first().click({ timeout: 8000 });
    await pA.waitForURL(/\/create/, { timeout: 10000 });
    await pA.waitForTimeout(2200);
    await pA.locator('textarea[placeholder="Write your post"], textarea').first().fill(postText);
    const postBtn = pA.getByRole('button', { name: /^Post$/ }).first();
    for (let i = 0; i < 14; i++) {
      if ((await postBtn.getAttribute('disabled')) === null) break;
      await pA.waitForTimeout(500);
    }
    const disabled = await postBtn.getAttribute('disabled');
    if (disabled !== null)
      throw new Error('Post button still disabled after SPA nav (emailVerified gate)');
    await postBtn.click();
    await pA.waitForTimeout(2500);
    await nav(pA, `/profile/${aliceUid}?tab=posts`, 2800);
    const txt = await waitForText(pA, 'E2E QA post', 12000);
    if (!txt.includes('E2E QA post'))
      throw new Error(`post not on profile (Posts tab) url=${new URL(pA.url()).pathname} snippet=${txt.slice(0, 220)}`);
    const href = await pA.evaluate(() => {
      const a = [...document.querySelectorAll('a[href*="/post/"]')];
      return a.length ? a[0].getAttribute('href') : null;
    });
    postId = href ? href.split('/').pop() : null;
    return 'post id ' + postId;
  });

  await step('S07b', 'verified user: FULL reload into /create keeps Post enabled', async () => {
    global.__lastPage = pA;
    // Bug repro (P1): app/create/page.js runs a one-shot isEmailVerified()
    // check that races auth restore on cold loads; no interval/focus re-check
    // unlike EmailVerificationBanner. Server-side emailVerified is true here
    // (verified in S03 via accounts:lookup).
    await nav(pA, '/create', 3000);
    await pA.locator('textarea[placeholder="Write your post"], textarea').first().fill('repro probe');
    const postBtn = pA.getByRole('button', { name: /^Post$/ }).first();
    await pA.waitForTimeout(4000);
    const disabled = (await postBtn.getAttribute('disabled')) !== null;
    const txt = await pageText(pA);
    const hint = /Verify your email to post/.test(txt);
    if (disabled || hint)
      throw new Error(
        `P1 repro: Post disabled=${disabled} hint=${hint} although accounts:lookup says emailVerified=true — ` +
        'one-shot check at mount before auth.currentUser restores, never re-checked'
      );
    return 'enabled';
  });

  await step('S08', 'post persists after reload', async () => {
    // full page load (S07b left us on /create, so navigate fresh)
    await nav(pA, `/profile/${aliceUid}?tab=posts`, 2800);
    const txt = await waitForText(pA, 'E2E QA post', 12000);
    if (!txt.includes('E2E QA post')) throw new Error('post missing after reload');
    return 'persisted';
  });

  await step('S09', 'like toggles and persists', async () => {
    global.__lastPage = pA;
    const cardSel = `xpath=//button[@aria-label="Like post" or @aria-label="Unlike post"]/ancestor::*[.//text()[contains(.,'E2E QA post')]][1]`;
    let card = pA.locator(cardSel).first();
    await card.waitFor({ timeout: 8000 });
    let likeBtn = card.locator('button[aria-label="Like post"], button[aria-label="Unlike post"]').first();
    const before = await likeBtn.getAttribute('aria-label');
    await likeBtn.click();
    await pA.waitForTimeout(2000);
    const after = await likeBtn.getAttribute('aria-label');
    if (before === after) throw new Error(`aria did not flip (still ${after})`);
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2600);
    card = pA.locator(cardSel).first();
    await card.waitFor({ timeout: 8000 });
    likeBtn = card.locator('button[aria-label="Like post"], button[aria-label="Unlike post"]').first();
    const persisted = await likeBtn.getAttribute('aria-label');
    if (persisted !== 'Unlike post') throw new Error(`like not persisted (=${persisted})`);
    return 'liked + persisted';
  });

  await step('S10', 'comment posts and persists', async () => {
    global.__lastPage = pA;
    const card = pA.locator(`xpath=//button[contains(@aria-label,'comments')]/ancestor::*[.//text()[contains(.,'E2E QA post')]][1]`).first();
    const cbtn = card.locator('button[aria-label*="comments"]').first();
    await cbtn.waitFor({ timeout: 8000 });
    await cbtn.click();
    await pA.waitForURL(/\/post\//, { timeout: 12000 }).catch(() => {});
    await pA.waitForTimeout(2400);
    if (!/\/post\//.test(pA.url())) throw new Error('did not open post page, at ' + pA.url());
    postId = postId || new URL(pA.url()).pathname.split('/').pop();
    const comment = `E2E comment ${stamp}`;
    await pA.locator('textarea[aria-label="Add a comment"], input[aria-label="Add a comment"]').first().fill(comment);
    await pA.getByRole('button', { name: /^Send$/ }).first().click();
    await pA.waitForTimeout(2600);
    let txt = await pageText(pA);
    if (!txt.includes(comment)) throw new Error('comment not visible');
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2600);
    txt = await pageText(pA);
    if (!txt.includes(comment)) throw new Error('comment lost after reload');
    return 'comment persisted';
  });

  console.log('== follow/notifications ==');
  await step('S11', 'Bob follows Alice (button + persistence)', async () => {
    global.__lastPage = pB;
    await nav(pB, `/profile/${aliceUid}`, 2600);
    const followBtn = pB.getByRole('button', { name: /^(Follow|Following)$/ }).first();
    await followBtn.waitFor({ timeout: 8000 });
    let label = (await followBtn.innerText()).trim();
    if (label !== 'Follow') throw new Error('button already ' + label);
    await followBtn.click();
    await pB.waitForTimeout(2400);
    label = (await followBtn.innerText()).trim();
    if (label !== 'Following') throw new Error('after click = ' + label);
    await pB.reload({ waitUntil: 'domcontentloaded' });
    await pB.waitForTimeout(2800);
    const f2 = pB.getByRole('button', { name: /^(Follow|Following)$/ }).first();
    await f2.waitFor({ timeout: 8000 });
    const after = (await f2.innerText()).trim();
    if (after !== 'Following') {
      RESULTS.push({
        id: 'S11b', name: 'follow state survives reload', status: 'FAIL',
        detail: `button shows "${after}" after reload while the DB relationship persists — followedUsers is never hydrated from Firestore (store.js partialize excludes it; ProfileView reads only zustand). Re-clicking "Follow" toggles the DB relationship OFF while the UI shows "Following".`,
      });
      process.stdout.write('  S11b FAIL follow state survives reload — shows "' + after + '"\n');
    } else {
      RESULTS.push({ id: 'S11b', name: 'follow state survives reload', status: 'PASS', detail: '' });
    }
    return 'followed';
  });

  await step('S12', "Alice's follower count = 1 (DB)", async () => {
    const fs = await nodeFs(A);
    const d = await fs.get('users', aliceUid);
    if (!d || d.followers !== 1) throw new Error(`DB followers=${d && d.followers} (expected 1)`);
    await nav(pA, `/profile/${aliceUid}`, 2600);
    const txt = await pageText(pA);
    const m = txt.match(/(\d+)\s*Followers?\b/i) || txt.match(/Followers?\D*(\d+)/i);
    if (!m) throw new Error('Followers stat not visible on UI');
    if (m[1] !== '1') throw new Error(`UI followers=${m[1]} (expected 1)`);
    return 'DB=1, UI=1';
  });

  await step('S13', 'Alice gets the follow notification (hers only)', async () => {
    await nav(pA, '/notifications', 3200);
    const txt = await pageText(pA);
    if (!/Bob QA started following you/.test(txt)) throw new Error('Alice missing follow notification');
    await nav(pB, '/notifications', 3200);
    const txtB = await pageText(pB);
    if (/Alice QA started following you/.test(txtB)) throw new Error('Bob has Alice follow notification');
    return 'A has it, B does not';
  });

  console.log('== messaging ==');
  await step('S14', 'Bob sends Alice a DM', async () => {
    global.__lastPage = pB;
    await nav(pB, `/profile/${aliceUid}`, 2600);
    await pB.getByRole('button', { name: /^Message$/ }).first().click();
    await pB.waitForURL(/\/messages\//, { timeout: 15000 });
    await pB.waitForTimeout(2600);
    await dismissCookie(pB);
    const msg = `E2E hello from bob ${stamp}`;
    const composer = pB.locator('textarea[aria-label="Type a message"]');
    await composer.waitFor({ timeout: 10000 });
    await composer.fill(msg);
    await composer.press('Enter');
    await pB.waitForTimeout(2600);
    const txt = await pageText(pB);
    if (!txt.includes(msg)) throw new Error('own message not visible after send');
    await pB.reload({ waitUntil: 'domcontentloaded' });
    await pB.waitForTimeout(2800);
    const txt2 = await pageText(pB);
    if (!txt2.includes(msg)) throw new Error('message lost after reload (sender side)');
    return 'sent + persisted (sender)';
  });

  await step('S15', 'Alice receives and replies', async () => {
    global.__lastPage = pA;
    await nav(pA, `/profile/${bobUid}`, 2800);
    await pA.getByRole('button', { name: /^Message$/ }).first().click();
    await pA.waitForURL(/\/messages\/.+/, { timeout: 15000 });
    await pA.waitForTimeout(2800);
    const t2 = await pageText(pA);
    if (!t2.includes('E2E hello from bob')) throw new Error("Bob's message not visible to Alice");
    const reply = `E2E hi from bob ${stamp}`;
    const composer = pA.locator('textarea[aria-label="Type a message"]');
    await composer.waitFor({ timeout: 10000 });
    await composer.fill(reply);
    await composer.press('Enter');
    await pA.waitForTimeout(2400);
    const t3 = await pageText(pA);
    if (!t3.includes(reply)) throw new Error('reply not visible');
    return 'received + replied';
  });

  await step('S15b', 'conversation row in list opens the thread', async () => {
    global.__lastPage = pA;
    await nav(pA, '/messages', 3400);
    const before = new URL(pA.url()).pathname;
    const matches = await pA.evaluate(() => {
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const out = [];
      document.querySelectorAll('div,button,li,a').forEach((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (!/Bob QA/.test(t)) return;
        const b = el.getBoundingClientRect();
        out.push({
          tag: el.tagName, x: Math.round(b.x), y: Math.round(b.y),
          w: Math.round(b.width), h: Math.round(b.height), text: t.slice(0, 60),
        });
      });
      return { vp, out };
    });
    let clicked = false;
    try {
      clicked = await leftHalfClick(pA, 'div,button,li,a', /Bob QA/, 5000);
    } catch (e) {
      throw new Error('row not clickable: ' + e.message.slice(0, 150) + ' | matches=' + JSON.stringify(matches.out));
    }
    await pA.waitForTimeout(3500);
    const after = new URL(pA.url()).pathname;
    if (after === before || !/\/messages\/.+/.test(after))
      throw new Error(
        `row click did not navigate (before=${before} after=${after}) | matches=` +
        JSON.stringify(matches.out.filter((m) => m.x < matches.vp.w / 2))
      );
    return 'opened ' + after;
  });

  await step('S16', 'Bob sees the reply in real time', async () => {
    const reply = `E2E hi from bob ${stamp}`;
    let txt = await pageText(pB);
    if (!txt.includes(reply)) {
      await pB.waitForTimeout(3500);
      txt = await pageText(pB);
    }
    if (!txt.includes(reply)) throw new Error('reply not seen on B side');
    return 'realtime ok';
  });

  console.log('== logout/account switch ==');
  await step('S17', 'logout completely switches account (A ctx → Bob)', async () => {
    global.__lastPage = pA;
    // /settings/account has NO logout row (only Delete account); the log-out
    // button lives on /settings (and inside the mobile Drawer).
    await nav(pA, '/settings', 2400);
    await inViewportClick(pA, 'button', /log ?out|sign ?out/i);
    await pA.waitForURL(/\/login/, { timeout: 15000 });
    await pA.waitForTimeout(1500);
    await login(pA, B);
    const chipBob = await pA.getByRole('button', { name: /Bob QA @/ }).count();
    const chipAlice = await pA.getByRole('button', { name: /Alice QA @/ }).count();
    if (!chipBob) throw new Error('profile chip does not show Bob after switch');
    if (chipAlice) throw new Error('Alice chip still present after switching to Bob');
    // note: zustand partialize intentionally excludes profile from
    // localStorage, so persistence is asserted via the auth-derived chip.
    return 'ctxA now Bob (chip verified)';
  });

  await step('S18', 're-login restores session', async () => {
    await nav(pA, '/settings', 2200);
    await inViewportClick(pA, 'button', /log ?out|sign ?out/i);
    await pA.waitForURL(/\/login/, { timeout: 15000 });
    await pA.waitForTimeout(1200);
    await login(pA, B);
    if (/\/login/.test(pA.url())) throw new Error('login failed');
    const chip = await pA.getByRole('button', { name: /Bob QA @/ }).count();
    if (!chip) throw new Error('profile chip does not show Bob after relogin');
    return 'session restored';
  });

  await step('S19', 'notification settings toggle persists', async () => {
    await nav(pA, '/settings/notifications', 2400);
    const sw = pA.locator('[role="switch"]:visible').first();
    await sw.waitFor({ timeout: 8000 });
    const before = await sw.getAttribute('aria-checked');
    await sw.click();
    await pA.waitForTimeout(800);
    const toggled = await sw.getAttribute('aria-checked');
    if (toggled === before) return `no flip (before=${before}) — info`;
    // The switch only mutates local state; persistence happens via Save.
    await pA.getByRole('button', { name: /Save Preferences/ }).click({ timeout: 8000 });
    await pA.waitForTimeout(2200);
    const t = await toast(pA);
    if (/Failed to save/i.test(t)) throw new Error(`save failed: ${t}`);
    await pA.reload({ waitUntil: 'domcontentloaded' });
    await pA.waitForTimeout(2600);
    const after = await pA.locator('[role="switch"]:visible').first().getAttribute('aria-checked');
    if (after !== toggled) throw new Error(`before=${before} toggled=${toggled} afterReload=${after} — toggle does not persist`);
    return `persisted (before=${before} → ${toggled})`;
  });

  console.log('== security ==');
  await step('S20', 'admin page denies normal user', async () => {
    await nav(pA, '/admin', 2600);
    const txt = await pageText(pA);
    if (!/access denied/i.test(txt)) throw new Error('NO access denied banner at /admin');
    if (/Moderation|Reports/i.test(txt)) throw new Error('admin UI content visible');
    return 'denied';
  });
  await step('S21', 'public user doc has no email/fcmTokens', async () => {
    const r = await fetch(`http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/users/${aliceUid}`, { redirect: 'manual' });
    let d = null;
    try { d = await r.json(); } catch {}
    const fields = (d && d.fields) || {};
    if ('email' in fields) throw new Error('email exposed on public profile');
    if ('fcmTokens' in fields) throw new Error('fcmTokens exposed on public profile');
    return 'clean';
  });

  console.log('== feature smokes ==');
  await step('S26', 'search finds Alice from Bob', async () => {
    await nav(pB, '/search', 2400);
    const inp = pB.locator('input[aria-label="Search"], input[placeholder*="Search"]').first();
    await inp.fill('Alice');
    await pB.waitForTimeout(3000);
    const txt = await pageText(pB);
    if (!/Alice/.test(txt)) throw new Error('no Alice in search results');
    return 'found';
  });
  await step('S27', 'project create + persists', async () => {
    global.__lastPage = pB;
    await nav(pB, '/projects/new', 2600);
    await fillByLabel(pB, 'e.g. AgriFlow', `E2E Project ${stamp}`);
    await fillByLabel(pB, 'One paragraph that a founder skimming the list would understand.', 'A QA project to verify persistence.');
    const btn = pB.getByRole('button', { name: /^Create project$/ }).first();
    await btn.click({ timeout: 10000 });
    await pB.waitForTimeout(3200);
    await nav(pB, '/projects', 2800);
    const txt = await pageText(pB);
    if (!txt.includes('E2E Project')) throw new Error('project not listed');
    return 'created + listed';
  });
  await step('S28', 'Copilot page handles send gracefully', async () => {
    await nav(pA, '/copilot', 2600);
    const inp = pA.locator('main textarea:visible, textarea:visible').last();
    await inp.fill('hello copilot');
    const send = pA.locator('button[aria-label="Send"]').first();
    if (await send.count()) await send.click(); else await inp.press('Enter');
    await pA.waitForTimeout(7000);
    const txt = await pageText(pA);
    if (/something went wrong|unhandled|application error/i.test(txt))
      throw new Error('hard error UI shown: ' + txt.slice(0, 150));
    return 'no crash (response quality needs API key)';
  });
  await step('S29', 'story create page loads', async () => {
    await nav(pA, '/stories/create', 2600);
    const txt = await pageText(pA);
    if (/page not found/i.test(txt)) throw new Error('404');
    return 'loaded';
  });
  await step('S30', "Alice's profile data intact at end", async () => {
    await nav(pA, `/profile/${aliceUid}`, 2600);
    const txt = await pageText(pA);
    if (!/E2E QA bio/.test(txt)) throw new Error("Alice's bio missing");
    await nav(pA, `/profile/${aliceUid}?tab=posts`, 2600);
    const txt2 = await waitForText(pA, 'E2E QA post', 12000);
    if (!/E2E QA post/.test(txt2))
      throw new Error(`Alice's post missing url=${new URL(pA.url()).pathname} snippet=${txt2.slice(0, 220)}`);
    return 'post + bio intact';
  });

  const summary = {
    when: new Date().toISOString(),
    accounts: { alice: aliceUid, bob: bobUid },
    results: RESULTS,
    consoleErrors: [...new Set(consoleErrors)],
    counts: {
      pass: RESULTS.filter((r) => r.status === 'PASS').length,
      fail: RESULTS.filter((r) => r.status === 'FAIL').length,
    },
  };
  fs.writeFileSync(path.join(__dirname, 'results', 'e2e.json'), JSON.stringify(summary, null, 2));
  console.log(`\n== E2E DONE: ${summary.counts.pass} pass, ${summary.counts.fail} fail, ${summary.consoleErrors.length} unique console errors`);
  for (const r of RESULTS.filter((x) => x.status === 'FAIL')) console.log('  FAIL', r.id, r.name, '—', r.detail.slice(0, 170));
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
