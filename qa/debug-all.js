// Focused QA debug: (1) email verification via emulator OOB,
// (2) what intercepts clicks on /settings/account, (3) profile save persistence.
const { chromium } = require('playwright');
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');

const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const BASE = 'http://localhost:3100';
const idb = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';

async function oobVerify(email, pass) {
  const s = await fetch(`${idb}/accounts:signInWithPassword?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const j = await s.json();
  await fetch(`${idb}/accounts:sendOobCode?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: j.idToken }),
  });
  const r = await fetch('http://localhost:9099/emulator/v1/projects/foundators-66eb7/oobCodes');
  const codes = (await r.json()).oobCodes || [];
  const mine = codes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop();
  return { idToken: j.idToken, link: mine && mine.oobLink };
}
async function lookupVerified(idToken) {
  const r = await fetch(`${idb}/accounts:lookup?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const j = await r.json();
  return j.users && j.users[0] ? j.users[0].emailVerified : 'unknown';
}

(async () => {
  const email = `dbg.${Date.now()}@qa.test`;
  const pass = 'Test1234!';
  const su = await fetch(`${idb}/accounts:signUp?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const sj = await su.json();
  console.log('1) signUp', su.status, sj.localId);

  // node SDK against emulators — same app instance reused below
  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
    storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
    appId: '1:895663747948:web:e5220d538c767f34ec3949',
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);
  await signInWithEmailAndPassword(auth, email, pass);
  const uid = auth.currentUser.uid;
  await setDoc(doc(db, 'users', uid), {
    uid, name: 'Dbg User', handle: '@dbguser', avatar: '', bio: '', role: '',
    location: '', website: '', skills: [], profileCompleted: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  console.log('   user doc created for uid', uid.slice(0, 8));

  let v = await oobVerify(email, pass);
  console.log('   oob link?', !!v.link, v.link ? v.link.slice(0, 95) : '');
  console.log('   verified BEFORE visit:', await lookupVerified(v.idToken));
  if (v.link) {
    const resp = await fetch(v.link, { redirect: 'manual' });
    console.log('   visit link status:', resp.status, (resp.headers.get('location') || '').slice(0, 90));
    const body = await resp.text().catch(() => '');
    console.log('   body snippet:', body.replace(/\s+/g, ' ').slice(0, 240));
  }
  console.log('   verified AFTER visit:', await lookupVerified(v.idToken));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('   [console.error]', m.text().slice(0, 170)); });

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('input[aria-label="Email address"]').fill(email);
  await page.locator('input[aria-label="Password"]').first().fill(pass);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2500);
  console.log('2) logged in browser, url:', page.url());

  const cookie = page.locator('[role="dialog"][aria-label="Cookie consent"]');
  console.log('   cookie banner present:', await cookie.count());
  if (await cookie.count()) {
    const ab = cookie.locator('button', { hasText: /accept/i });
    if (await ab.count()) await ab.click();
    await page.waitForTimeout(400);
    console.log('   cookie accepted, present now:', await cookie.count());
  }

  await page.goto(BASE + '/settings/account', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const btn = page.locator('button:visible').filter({ hasText: /log ?out/i }).first();
  console.log('   logout matches:', await btn.count());
  if (await btn.count()) {
    const box = await btn.boundingBox();
    console.log('   logout box:', JSON.stringify(box));
    if (box) {
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return 'null';
        return `<${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 100)}"> text="${(el.innerText || '').replace(/\s+/g, ' ').slice(0, 70)}"`;
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      console.log('   elementFromPoint at center:', hit);
    }
    // try a real click with short timeout
    try {
      await btn.click({ timeout: 4000 });
      console.log('   click SUCCEEDED, url now:', page.url());
    } catch (e) {
      console.log('   click FAILED:', String(e.message).replace(/\s+/g, ' ').slice(0, 300));
    }
  }
  await page.screenshot({ path: require('path').join(__dirname, 'screenshots', 'dbg-account.png') });

  await page.goto(BASE + '/settings/edit-profile', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const bioVal = 'DEBUG BIO ' + Date.now();
  const bioLoc = page.locator('textarea[placeholder="Tell people about yourself..."], input[placeholder="Tell people about yourself..."]').first();
  console.log('3) bio field count:', await bioLoc.count());
  await bioLoc.fill(bioVal);
  await page.getByRole('button', { name: /^Save$/ }).first().click();
  await page.waitForTimeout(2500);
  const toastTxt = await page.evaluate(() =>
    [...document.querySelectorAll('[class*=toast],[role=alert]')].map((n) => n.innerText.replace(/\s+/g, ' ')).join(' | '));
  console.log('   toast after save:', JSON.stringify(toastTxt.slice(0, 160)));

  const snap = await getDoc(doc(db, 'users', uid));
  const d = snap.data() || {};
  console.log('   FS bio:', JSON.stringify(d.bio), '| role:', JSON.stringify(d.role), '| updatedAt:', !!d.updatedAt, '| email:', d.email);
  const lk = await fetch(`${idb}/accounts:lookup?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: await auth.currentUser.getIdToken() }),
  }).then((r) => r.json());
  console.log('   auth emailVerified after browser login:', lk.users?.[0]?.emailVerified);

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
