const fs = require('fs');
const { execSync } = require('child_process');

const mig = execSync('git show HEAD:supabase/migrations', { encoding: 'utf8', maxBuffer: 1e8 });
let migText = '';
for (const f of mig.trim().split('\n')) {
  const name = f.trim().split(/\s+/).pop();
  if (name && name.endsWith('.sql')) {
    try { migText += fs.readFileSync('supabase/migrations/' + name, 'utf8'); } catch {}
  }
}

const files = execSync('git grep -l "useStore\\|getSupabase\\|process.env" -- app components lib', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const rpcs = new Set(), tables = new Set(), envs = new Set();
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  for (const m of c.matchAll(/\.rpc\(\s*'([a-zA-Z0-9_]+)'/g)) rpcs.add(m[1] + '  <-  ' + f);
  for (const m of c.matchAll(/\.from\(\s*'([a-zA-Z0-9_]+)'/g)) tables.add(m[1]);
  for (const m of c.matchAll(/process\.env\.([A-Z0-9_]+)/g)) envs.add(m[1] + '  <-  ' + f);
}

const problems = [];
for (const r of rpcs) {
  const name = r.split(' ')[0];
  if (!migText.includes(name)) problems.push('RPC not in migrations: ' + r);
}
for (const t of tables) {
  if (['uploads', 'avatars', 'covers'].includes(t)) continue;
  if (!migText.includes(t)) problems.push('table not in migrations: ' + t);
}
for (const e of envs) {
  const name = e.split(' ')[0], file = e.split('  <-  ')[1];
  const isClient = fs.readFileSync(file, 'utf8').startsWith("'use client'") || fs.readFileSync(file, 'utf8').startsWith('"use client"');
  if (isClient && !name.startsWith('NEXT_PUBLIC_')) problems.push('server-only env in CLIENT file: ' + e);
}
console.log(problems.length ? problems.join('\n') : 'all RPCs, tables, and env refs check out');
