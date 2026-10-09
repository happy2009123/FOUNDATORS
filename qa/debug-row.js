const { chromium } = require('playwright');
const pass = 'Test1234!';
const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const A = { email: `rw.a.${stamp}@qa.test`, pass, name: 'RowAlice' };
const B = { email: `rw.b.${stamp}@qa.test`, pass, name: 'RowBob' };

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
    p.on('console', (m) => { if (m.type() === 'error') console.log('  [err]', m.text().slice(0, 250)); });
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
  console.log('A', A.uid, 'B', B.uid);

  await pB.goto('http://localhost:3100/profile/' + A.uid, { waitUntil: 'domcontentloaded' });
  await pB.waitForTimeout(2600);
  await pB.getByRole('button', { name: /^Message$/ }).first().click();
  await pB.waitForURL(/\/messages\//, { timeout: 15000 });
  await pB.waitForTimeout(2600);
  const comp = pB.locator('textarea[aria-label="Type a message"]');
  await comp.waitFor({ timeout: 10000 });
  await comp.fill('ROWPROBE ' + stamp);
  await comp.press('Enter');
  await pB.waitForTimeout(2500);

  // Alice: inspect + click the conversation row
  await pA.goto('http://localhost:3100/messages', { waitUntil: 'domcontentloaded' });
  await pA.waitForTimeout(3500);
  const info = await pA.evaluate(() => {
    const out = [];
    document.querySelectorAll('div,button,li,a,span').forEach((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!/RowBob/.test(t)) return;
      const b = el.getBoundingClientRect();
      out.push({
        tag: el.tagName, cls: (el.className || '').toString().slice(0, 70),
        x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
        text: t.slice(0, 70), pe: getComputedStyle(el).pointerEvents,
      });
    });
    return out;
  });
  console.log('matches for RowBob:');
  info.forEach((m) => console.log('  ', JSON.stringify(m)));
  console.log('url before:', new URL(pA.url()).pathname);

  // click the most specific: span with exactly RowBob in left half
  const target = info.filter((m) => m.x < 640 && m.tag === 'SPAN').sort((a, b) => a.w - b.w)[0]
    || info.filter((m) => m.x < 640).sort((a, b) => a.w - b.w)[0];
  console.log('clicking:', JSON.stringify(target));
  if (target) {
    // locate by text+box: click via coordinates to bypass selector ambiguity
    await pA.mouse.click(target.x + target.w / 2, target.y + target.h / 2);
    await pA.waitForTimeout(3500);
    console.log('url after coordinate click:', new URL(pA.url()).pathname);
  }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
