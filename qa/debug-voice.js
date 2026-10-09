// Evidence: P2-B — /voice listener rules crash (Null value in voice helpers).
// Repro: sign in, open /voice (and /voice/create), capture the exact
// permission-denied signature the listeners throw, and test whether a room
// created directly via the SDK is listable from the browser.
// Usage: node qa/debug-voice.js
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const U = { email: `voice.${stamp}@qa.test`, pass: 'Test1234!', name: 'Voice Tester' };

async function rest(path, body) {
  return fetch(`${IDB}/${path}?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json());
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 400)}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 300)));

  // signup
  await page.goto(BASE + '/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.locator('input[aria-label="Full name"]').fill(U.name);
  await page.locator('input[aria-label="Email address"]').fill(U.email);
  await page.locator('input[aria-label="Password"]').first().fill(U.pass);
  await page.locator('input[aria-label="Confirm password"]').fill(U.pass);
  await page.getByRole('button', { name: /Create Account/ }).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const s = await rest('accounts:signInWithPassword', { email: U.email, password: U.pass, returnSecureToken: true });
  const uid = s.localId;
  console.log('uid:', uid);

  // seed a voice room directly (as this user) so the list is non-empty
  const { initializeApp, getApps } = require('firebase/app');
  const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp } = require('firebase/firestore');
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
  const roomId = 'qa_room_' + stamp;
  let seeded = false;
  try {
    await setDoc(doc(db, 'voiceRooms', roomId), {
      title: 'QA voice probe', hostKey: uid, hostName: U.name,
      status: 'live', visibility: 'public', participantsCount: 0,
      createdAt: serverTimestamp(),
    });
    seeded = true;
    console.log('seeded room:', roomId);
  } catch (e) {
    console.log('room seed FAILED:', e.code || e.message);
  }

  console.log('\n== /voice ==');
  errors.length = 0;
  await page.goto(BASE + '/voice', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const voiceBody = await page.locator('body').innerText();
  console.log('rendered:', voiceBody.replace(/\s+/g, ' ').slice(0, 260));
  if (seeded) console.log('seeded room visible:', voiceBody.includes('QA voice probe'));
  console.log('errors:', errors.length);
  errors.forEach((e) => console.log('  ' + e.slice(0, 320)));

  console.log('\n== /voice/create ==');
  errors.length = 0;
  await page.goto(BASE + '/voice/create', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const createBody = await page.locator('body').innerText();
  console.log('rendered:', createBody.replace(/\s+/g, ' ').slice(0, 260));
  console.log('errors:', errors.length);
  errors.forEach((e) => console.log('  ' + e.slice(0, 320)));

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
