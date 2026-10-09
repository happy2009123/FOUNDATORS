const { chromium } = require('playwright');
const email = process.env.DBG_EMAIL; // Alice-from-previous-run? no — fresh pair created below
const pass = 'Test1234!';

async function rest(p, body) {
  return fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/' + p + '?key=AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then((r) => r.json());
}
async function fsList(path) {
  const r = await fetch('http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/' + path, { redirect: 'manual' });
  const j = await r.json().catch(() => null);
  return (j && j.documents) || [];
}

(async () => {
  const stamp = Date.now();
  const A = { email: `m.a.${stamp}@qa.test`, pass, name: 'MsgAlice' };
  const B = { email: `m.b.${stamp}@qa.test`, pass, name: 'MsgBob' };
  async function verifyNow(u) {
    const s = await rest('accounts:signInWithPassword', { email: u.email, password: u.pass, returnSecureToken: true });
    u.uid = s.localId;
    await rest('accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: s.idToken });
    const codes = await fetch('http://localhost:9099/emulator/v1/projects/foundators-66eb7/oobCodes').then((x) => x.json());
    for (const c of (codes.oobCodes || []).filter((c) => c.email === u.email)) await fetch(c.oobLink, { redirect: 'manual' }).catch(() => {});
  }

  const browser = await chromium.launch();
  const mk = async (u) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('console', (m) => {
      if (m.type() !== 'error') return;
      const loc = m.location();
      console.log('  [err]', m.text().slice(0, 130), '@', (loc && loc.url || '').slice(0, 140));
    });
    // full app signup so the users/{uid} doc exists (rules reject raw REST creates)
    await p.goto('http://localhost:3100/signup', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input[aria-label="Full name"]').fill(u.name);
    await p.locator('input[aria-label="Email address"]').fill(u.email);
    await p.locator('input[aria-label="Password"]').first().fill(u.pass);
    await p.locator('input[aria-label="Confirm password"]').fill(u.pass);
    await p.getByRole('button', { name: /Create Account/ }).click();
    await p.waitForURL(/\/(home|onboarding)/, { timeout: 30000 });
    await p.waitForTimeout(2400);
    return p;
  };
  const pA = await mk(A);
  await verifyNow(A);
  const pB = await mk(B);
  await verifyNow(B);
  console.log('A uid', A.uid, 'B uid', B.uid);

  // Bob → Alice profile → Message
  await pB.goto('http://localhost:3100/profile/' + A.uid, { waitUntil: 'domcontentloaded' });
  await pB.waitForTimeout(2600);
  await pB.getByRole('button', { name: /^Message$/ }).first().click();
  await pB.waitForURL(/\/messages\//, { timeout: 15000 });
  await pB.waitForTimeout(2600);
  const msg = 'MSGDEBUG hello ' + stamp;
  const composer = pB.locator('textarea[aria-label="Type a message"]');
  await composer.waitFor({ timeout: 10000 });
  await composer.fill(msg);
  await composer.press('Enter');
  await pB.waitForTimeout(2500);
  console.log('B thread url:', new URL(pB.url()).pathname);

  // inspect FS: chats + their messages
  const chats = await fsList('chats');
  console.log('chats in FS:', chats.length);
  for (const c of chats) {
    const id = c.name.split('/').pop();
    const parts = ((c.fields && c.fields.participants) || {}).arrayValue || {};
    const uids = (parts.values || []).map((v) => v.stringValue);
    if (!uids.includes(A.uid) && !uids.includes(B.uid)) continue;
    console.log(' chat', id, 'participants:', uids.join(','));
    const msgs = await fsList('chats/' + id + '/messages');
    console.log('   messages:', msgs.length);
    for (const m of msgs) {
      const f = m.fields || {};
      console.log('    -', (f.senderId || {}).stringValue, '|', ((f.text || {}).stringValue || '').slice(0, 40), '|', (f.createdAt || {}).timestampValue || '');
    }
  }

  // Alice → messages list → click Bob row
  await pA.goto('http://localhost:3100/messages', { waitUntil: 'domcontentloaded' });
  await pA.waitForTimeout(3400);
  const listTxt = await pA.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('A list contains MsgBob:', /MsgBob/.test(listTxt));
  const row = pA.getByText(/MsgBob/).first();
  const rowCount = await pA.getByText(/MsgBob/).count();
  console.log('MsgBob text nodes:', rowCount);
  await row.click();
  await pA.waitForTimeout(3500);
  console.log('A url after click:', new URL(pA.url()).pathname);
  const threadTxt = await pA.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('A thread contains msg:', threadTxt.includes(msg));
  console.log('A thread snippet:', threadTxt.slice(0, 400));

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
