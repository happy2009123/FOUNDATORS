// Local OpenAI-compatible mock (port 8099) used to exercise the copilot AI path
// without paid API calls. Behaviour is driven by the requested model / message:
//   model "bogus-*"        -> 404 model_not_found  (test: invalid/unavailable model)
//   text contains EMPTYRESP-> 200 with empty content (test: empty response)
//   text contains BORKED   -> 200 with non-JSON junk in a card mode (test: malformed)
//   otherwise              -> valid chat content, or a valid analysis JSON card
const http = require('http');

const ANALYSIS = {
  type: 'analysis',
  title: 'Mock validated idea',
  idea: 'mock',
  industry: 'mock',
  audience: 'mock founders',
  summary: 'Mock summary from the local provider.',
  problem: 'Mock problem statement.',
  solution: 'Mock solution statement.',
  users: ['a', 'b', 'c'],
  competitors: ['x', 'y'],
  risks: ['r1', 'r2', 'r3', 'r4'],
  opportunities: ['o1', 'o2', 'o3'],
  nextStep: 'Mock next step.',
};

// Emulate a compliant provider: honour the type the system prompt requests
// (prompts say `type ("validation")`, `type ("mvp")`, ...) instead of always
// answering "analysis". Extra keys are harmless — the route only checks `type`.
function cardFor(systemText) {
  const m = /type\s*\(\s*"([a-z_]+)"\s*\)/.exec(systemText || '');
  const type = m ? m[1] : 'analysis';
  const card = { ...ANALYSIS, type };
  if (type === 'validation') {
    card.steps = [
      { title: 'Talk to 5 target users', how: '15-min calls', signal: 'repeat pain' },
      { title: 'Smoke test the promise', how: 'landing page', signal: '10% signup' },
    ];
    card.killCriteria = ['No urgent pain', 'Nobody returns'];
    card.successSignals = ['3 qualified leads', 'Paid preorders'];
  } else if (type === 'mvp') {
    card.targetUsers = ['founders'];
    card.features = [{ name: 'Dashboard', priority: 'high' }];
    card.tech = ['Next.js'];
    card.phases = [{ title: 'Build', goal: 'Ship', tasks: ['Scaffold'] }];
    card.milestones = [{ title: 'Beta', goal: 'Launch' }];
    card.tasks = [{ title: 'Scaffold', phase: 1, phaseTitle: 'Build', status: 'todo', order: 1 }];
  } else if (type === 'launch') {
    card.checklist = [{ label: 'Ship landing page', category: 'Product', done: false }];
    card.metric = '10 signups/week';
    card.timeline = '2 weeks';
  } else if (type === 'bwm_draft') {
    card.roles = 'Frontend dev';
    card.commitment = '5h/week';
    card.text = 'Build With Me — Mock\n\nWhat: a mock product.\nWho: a frontend dev.\nCommit: 5h/week.\nComment or DM to join.';
  }
  return card;
}


const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.method !== 'POST' || !/\/chat\/completions/.test(req.url || '')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'not found' } }));
      return;
    }
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch (e) {}
    const msgs = payload.messages || [];
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    const text = JSON.stringify(lastUser ? lastUser.content : '');
    const isCard = msgs.some((m) => m.role === 'system' && /valid JSON/.test(m.content || ''));

    if (String(payload.model || '').startsWith('bogus')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `The model \`${payload.model}\` does not exist`, type: 'invalid_request_error', code: 'model_not_found' } }));
      return;
    }
    if (/EMPTYRESP/.test(text)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '' } }] }));
      return;
    }
    if (/BORKED/.test(text) && isCard) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'this is not json at all' } }] }));
      return;
    }
    const systemMsg = msgs.find((m) => m.role === 'system');
    const content = isCard ? JSON.stringify(cardFor(systemMsg ? systemMsg.content : ''))
      : 'Mock AI reply: describe the idea in one paragraph, then validate it with 5 interviews this week.';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'mock-1', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content } }] }));
  });
});

server.listen(8099, () => console.log('mock-ai listening on 8099'));
