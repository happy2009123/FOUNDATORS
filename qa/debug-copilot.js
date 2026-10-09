// Repro: trace the copilot request end-to-end against the local emulators + dev server.
const BASE = 'http://localhost:3100';
const AUTH = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const email = `copilot.repro.${stamp}@qa.test`;
const pass = 'Test1234!';

async function j(res) { try { return await res.json(); } catch (e) { return null; } }

(async () => {
  // 1. Sign up against the Auth emulator
  const su = await fetch(`${AUTH}/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const suj = await j(su);
  console.log('[1] signUp status', su.status, 'hasIdToken', !!suj.idToken, 'localId', suj.localId || suj.error?.message);
  if (!suj.idToken) { console.log('ABORT: no token'); process.exit(1); }
  const idToken = suj.idToken;

  // 2. What verifyIdToken does: production identitytoolkit accounts:lookup
  const prodKey = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE'; // from lib/firebaseConfig.js (public web key)
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${prodKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const lookupJ = await j(lookup);
  console.log('[2] production accounts:lookup with EMULATOR token ->', lookup.status,
    JSON.stringify(lookupJ && lookupJ.error ? lookupJ.error : { users: (lookupJ.users || []).map(u => u.localId) }).slice(0, 300));

  // 3. Does the emulator accept its own token? (control)
  const lookupEmu = await fetch(`${AUTH}/accounts:lookup?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const lookupEmuJ = await j(lookupEmu);
  console.log('[3] EMULATOR accounts:lookup control ->', lookupEmu.status,
    JSON.stringify(lookupEmuJ && lookupEmuJ.error ? lookupEmuJ.error : { users: (lookupEmuJ.users || []).map(u => u.localId) }).slice(0, 200));

  // 4. Call the actual endpoint the frontend calls
  const cases = [
    { name: 'chat Hello', body: { idToken, mode: 'chat', payload: { message: 'Hello' }, history: [] } },
    { name: 'chat long question', body: { idToken, mode: 'chat', payload: { message: 'How do I price a B2B SaaS for early design partners?' }, history: [] } },
    { name: 'empty message', body: { idToken, mode: 'chat', payload: { message: '' }, history: [] } },
    { name: 'missing token', body: { mode: 'chat', payload: { message: 'Hello' }, history: [] } },
    { name: 'bad mode', body: { idToken, mode: 'nope', payload: { message: 'Hello' }, history: [] } },
    { name: 'analyze (card mode)', body: { idToken, mode: 'analyze', payload: { idea: 'A marketplace for indie founders to swap skills' }, history: [] } },
  ];
  for (const c of cases) {
    const res = await fetch(`${BASE}/api/copilot/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c.body),
    });
    const rj = await j(res);
    const d = rj && rj.data;
    const preview = typeof d === 'string' ? d.slice(0, 160) : (d ? JSON.stringify(d).slice(0, 160) : '(none)');
    console.log(`[4] ${c.name} -> HTTP ${res.status} ok=${rj && rj.ok} source=${rj && rj.source} error=${rj && rj.error}`);
    console.log(`      data: ${preview}`);
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
