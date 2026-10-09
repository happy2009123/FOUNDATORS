const { chromium } = require('playwright');
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc } = require('firebase/firestore');
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';

(async () => {
  const email = process.env.DBG_EMAIL;
  const pass = 'Test1234!';
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
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('console', (m) => console.log('  [c.' + m.type() + ']', m.text().slice(0, 150)));
  await page.goto('http://localhost:3100/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('input[aria-label="Email address"]').fill(email);
  await page.locator('input[aria-label="Password"]').first().fill(pass);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3100/settings/edit-profile', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const loc = page.locator('textarea[placeholder="Tell people about yourself..."]').first();
  console.log('bio field count:', await loc.count());
  await loc.fill('MICRO BIO TEST');
  await page.waitForTimeout(600);
  console.log('value after fill+600ms:', JSON.stringify(await loc.inputValue()));
  const saveBtns = page.getByRole('button', { name: /^Save$/ });
  console.log('save buttons:', await saveBtns.count());
  await saveBtns.first().click();
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(500);
    const t = await page.evaluate(() =>
      [...document.querySelectorAll('[class*=toast],[role=alert],[role=status]')]
        .map((n) => n.innerText.replace(/\s+/g, ' ')).filter(Boolean).join('|'));
    console.log('t+' + ((i + 1) * 500) + 'ms url=' + new URL(page.url()).pathname + ' toast=' + JSON.stringify(t.slice(0, 130)));
  }
  const s = await getDoc(doc(db, 'users', uid));
  console.log('FS bio after:', JSON.stringify((s.data() || {}).bio));
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
