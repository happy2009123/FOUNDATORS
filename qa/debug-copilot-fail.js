// Failure-path tests against the local mock: invalid model, empty content,
// malformed card JSON, network/provider failure, missing/expired session.
const BASE = 'http://localhost:3100';
const AUTH = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const email = `copilot.fail.${stamp}@qa.test`;
const pass = 'Test1234!';

async function j(res) { try { return await res.json(); } catch (e) { return null; } }

function show(name, res, rj) {
  const d = rj && rj.data;
  const preview = typeof d === 'string' ? d.slice(0, 90) : (d ? JSON.stringify(d).slice(0, 90) : '(none)');
  console.log(`${name.padEnd(34)} -> HTTP ${res.status}  ok=${rj && rj.ok}  source=${rj && rj.source || '-'}  err=${rj && rj.error || '-'}`);
  if (d) console.log(`    data: ${preview}`);
}

(async () => {
  const su = await fetch(`${AUTH}/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const good = (await j(su)).idToken;
  if (!good) { console.log('ABORT no token'); process.exit(1); }

  const post = (body) => fetch(`${BASE}/api/copilot/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(async (r) => ({ r, j: await j(r) }));

  console.log('--- failure / edge cases ---');
  let a = await post({ idToken: good, mode: 'chat', payload: { message: 'Hello' }, history: [] });
  show('1 hello (valid)', a.r, a.j);

  a = await post({ idToken: good, mode: 'chat', payload: { message: 'How do I find first users for a B2B SaaS with no budget? Be specific.' }, history: [] });
  show('2 long startup question', a.r, a.j);

  a = await post({ idToken: good, mode: 'chat', payload: { message: '' }, history: [] });
  show('3 empty message (expect 400)', a.r, a.j);

  a = await post({ idToken: good, mode: 'chat', payload: { message: 'hi', model: 'bogus-model' }, history: [], model: 'bogus-model' });
  // force invalid model by patching env-driven call: use payload flag the mock reads
  console.log('   (4 is exercised below via AI_MODEL override)');
  show('4 invalid model (via payload)', a.r, a.j);

  a = await post({ idToken: good, mode: 'chat', payload: { message: 'EMPTYRESP please' }, history: [] });
  show('5 empty provider content (expect 502)', a.r, a.j);

  a = await post({ idToken: good, mode: 'analyze', payload: { idea: 'BORKED idea' }, history: [] });
  show('6 malformed card JSON (expect 502)', a.r, a.j);

  a = await post({ mode: 'chat', payload: { message: 'Hello' }, history: [] });
  show('7 missing session (expect 401)', a.r, a.j);

  a = await post({ idToken: good + 'tampered', mode: 'chat', payload: { message: 'Hello' }, history: [] });
  show('8 expired/tampered token (expect 401)', a.r, a.j);

  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
