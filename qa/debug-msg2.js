const { chromium } = require('playwright');
const pass = 'Test1234!';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const A = { email: `m.a.${stamp}@qa.test`, pass, name: 'MsgAlice' };
const B = { email: `m.b.${stamp}@qa.test`, pass, name: 'MsgBob' };

async function rest(p, body) {
  return fetch(`${IDB}/${p}?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json());
}

(async () => {
  const browser = await chromium.launch();
  const mk = async (u) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('console', (m) => {
      if (m.type() !== 'error') return;
      console.log('  [err]', m.text().slice(0, 400));
    });
    // capture firestore writes: url + payload + response
    p.on('response', async (res) => {
      const url = res.url();
      if (!url.includes(':8080/') || res.request().method() === 'GET') return;
      try {
        const body = await res.text();
        const pd = res.request().postData() || '';
        const isCommit = pd.includes('%22writes%22') || pd.includes('"writes"');
        if (isCommit && (pd.includes('chats') || decodeURIComponent(url).includes('chats'))) {
          console.log('  [CHAT-WRITE] status', res.status);
          console.log('    REQ FULL:', decodeURIComponent(pd.replace(/\+/g, ' ')).slice(0, 6000));
          console.log('    RESP FULL:', body.slice(0, 3000));
        }
      } catch {}
    });
    await p.goto('http://localhost:3100/signup', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input[aria-label="Full name"]').fill(u.name);
    await p.locator('input[aria-label="Email address"]').fill(u.email);
    await p.locator('input[aria-label="Password"]').first().fill(u.pass);
    await p.locator('input[aria-label="Confirm password"]').fill(u.pass);
    await p.getByRole('button', { name: /Create Account/ }).click();
    await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
    await p.waitForTimeout(2400);
    const s = await rest('accounts:signInWithPassword', { email: u.email, password: u.pass, returnSecureToken: true });
    u.uid = s.localId;
    await rest('accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: s.idToken });
    const codes = await fetch('http://localhost:9099/emulator/v1/projects/foundators-66eb7/oobCodes').then((x) => x.json());
    for (const c of (codes.oobCodes || []).filter((c) => c.email === u.email)) await fetch(c.oobLink, { redirect: 'manual' }).catch(() => {});
    return p;
  };

  const pA = await mk(A);
  const pB = await mk(B);
  console.log('A uid', A.uid, 'B uid', B.uid);

  await pB.goto('http://localhost:3100/profile/' + A.uid, { waitUntil: 'domcontentloaded' });
  await pB.waitForTimeout(2600);
  await pB.getByRole('button', { name: /^Message$/ }).first().click();
  await pB.waitForURL(/\/messages\//, { timeout: 15000 });
  await pB.waitForTimeout(2600);
  const composer = pB.locator('textarea[aria-label="Type a message"]');
  await composer.waitFor({ timeout: 10000 });
  await composer.fill('PROBE payload ' + stamp);
  console.log('--- pressing Enter (send) ---');
  await composer.press('Enter');
  await pB.waitForTimeout(3500);
  console.log('B url:', new URL(pB.url()).pathname);

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
