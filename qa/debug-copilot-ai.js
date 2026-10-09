// Verifies the AI path + provider-failure visibility. Two runs:
//  (a) AI_API_KEY set to a real key, AI_BASE_URL = OpenRouter -> real AI reply
//  (b) AI_MODEL set to a bogus id          -> provider error surfaces (502)
const BASE = 'http://localhost:3100';
const AUTH = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const email = `copilot.ai.${stamp}@qa.test`;
const pass = 'Test1234!';

async function j(res) { try { return await res.json(); } catch (e) { return null; } }

(async () => {
  const su = await fetch(`${AUTH}/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const idToken = (await j(su)).idToken;
  if (!idToken) { console.log('ABORT no token'); process.exit(1); }

  const cases = [
    { name: 'AI chat "Hello" (real key)', mode: 'chat', payload: { message: 'Hello' } },
    { name: 'AI chat long question', mode: 'chat', payload: { message: 'How should a solo founder price a B2B SaaS for early design partners?' } },
    { name: 'AI analyze card', mode: 'analyze', payload: { idea: 'A marketplace for indie founders to swap skills' } },
  ];
  for (const c of cases) {
    const res = await fetch(`${BASE}/api/copilot/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, mode: c.mode, payload: c.payload, history: [] }),
    });
    const rj = await j(res);
    const d = rj && rj.data;
    const preview = typeof d === 'string' ? d.slice(0, 200) : (d ? JSON.stringify(d).slice(0, 200) : '(none)');
    console.log(`\n### ${c.name} -> HTTP ${res.status} ok=${rj && rj.ok} source=${rj && rj.source} error=${rj && rj.error}`);
    console.log(preview);
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
