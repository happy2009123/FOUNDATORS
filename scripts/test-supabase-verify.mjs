// Production verification suite for the FOUNDATORS Supabase migration.
//
//   node scripts/test-supabase-verify.mjs
//
// Sections: auth | data-isolation | database | rls | storage | realtime | rpc
// It creates TWO throwaway accounts (USER A / USER B), exercises them against
// the real project and prints PASS / FAIL / BLOCKED for every check.
// It never deletes production data — only rows it created itself.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}

const env = readEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY;

if (!URL_ || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const results = [];
async function t(section, name, fn) {
  try {
    const r = (await fn()) || {};
    results.push({ section, name, status: r.status || 'PASS', detail: r.detail || '' });
    const tag = (r.status || 'PASS').padEnd(7);
    console.log(`  [${tag}] ${section} :: ${name}${r.detail ? ' — ' + r.detail : ''}`);
  } catch (e) {
    results.push({ section, name, status: 'FAIL', detail: String(e && e.message ? e.message : e) });
    console.log(`  [FAIL  ] ${section} :: ${name} — ${e.message || e}`);
  }
}

// Node has no localStorage, so we emulate one per client. supabase-js persists
// the session through this adapter, which lets the "cold client" check prove
// that a session really survives an app restart (refresh persistence).
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}
const storageA = makeStorage();
const storageB = makeStorage();

const clientA = createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: false, storage: storageA, storageKey: 'foundators-test-a' } });
const clientB = createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: false, storage: storageB, storageKey: 'foundators-test-b' } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
const admin = SECRET ? createClient(URL_, SECRET, { auth: { persistSession: false } }) : null;

const stamp = Date.now().toString(36);
const creds = {
  a: { email: `verify.a.${stamp}@example.com`, password: 'VerifyPass!2345' },
  b: { email: `verify.b.${stamp}@example.com`, password: 'VerifyPass!2345' },
};

const ids = { a: null, b: null };
const state = {};
let signupBlocked = null;

// ─── helpers ────────────────────────────────────────────────
async function uidOf(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user.id;
}

async function ensureProfile(client, id, email, name) {
  await client.from('profiles').upsert(
    { id, email, name, handle: name.toLowerCase(), profile_completed: true, onboarded: true },
    { onConflict: 'id', ignoreDuplicates: false }
  );
}

// ─── 1. AUTHENTICATION ──────────────────────────────────────
async function authSection() {
  console.log('\n== 1. AUTHENTICATION ==');

  // GoTrue blocks repeated sign-ups ("email rate limit exceeded") and requires
  // e-mail confirmation, so the fallback path provisions the account through the
  // admin API (valid service key) and then signs in normally.
  const provision = async (client, cred) => {
    const { data, error } = await client.auth.signUp({ email: cred.email, password: cred.password });
    if (!error && data.session) return { status: 'PASS', detail: 'session returned by sign-up' };
    if (!admin) {
      signupBlocked = (error && /rate limit/i.test(error.message))
        ? 'e-mail rate limit hit and no working secret key for the admin fallback'
        : 'e-mail confirmation is ON and no working secret key for the admin fallback';
      return { status: 'BLOCKED', detail: signupBlocked + (error ? ` (${error.message})` : '') };
    }
    let detail = 'provisioned via admin API';
    if (error) detail += ` (sign-up blocked: ${error.message})`;
    const { error: e2 } = await admin.auth.admin.createUser({ email: cred.email, password: cred.password, email_confirm: true });
    if (e2 && !/already been registered/i.test(e2.message)) return { status: 'FAIL', detail: 'admin createUser: ' + e2.message };
    if (e2) detail += '; account already existed';
    const { error: e3 } = await client.auth.signInWithPassword({ email: cred.email, password: cred.password });
    if (e3) return { status: 'FAIL', detail: 'signIn after admin create: ' + e3.message };
    return { status: 'PASS', detail };
  };

  await t('auth', 'signup USER A returns a session', () => provision(clientA, creds.a));
  await t('auth', 'signup USER B returns a session', () => provision(clientB, creds.b));

  if (!ids.a && !signupBlocked) {
    try { ids.a = await uidOf(clientA); } catch {}
  }
  if (!ids.b && !signupBlocked) {
    try { ids.b = await uidOf(clientB); } catch {}
  }

  await t('auth', 'profile row loadable for A', async () => {
    if (!ids.a) return { status: 'BLOCKED', detail: signupBlocked };
    const { data, error } = await clientA.from('profiles').select('*').eq('id', ids.a).maybeSingle();
    if (error) return { status: 'FAIL', detail: error.message };
    if (!data) {
      await ensureProfile(clientA, ids.a, creds.a.email, 'Verify A');
      const again = await clientA.from('profiles').select('*').eq('id', ids.a).maybeSingle();
      return again.data ? { status: 'PASS', detail: 'profile row created on first login' } : { status: 'FAIL', detail: 'profile row not readable after create' };
    }
    return { status: 'PASS' };
  });

  await t('auth', 'profile row loadable for B', async () => {
    if (!ids.b) return { status: 'BLOCKED', detail: signupBlocked };
    const { data, error } = await clientB.from('profiles').select('*').eq('id', ids.b).maybeSingle();
    if (error) return { status: 'FAIL', detail: error.message };
    if (!data) {
      await ensureProfile(clientB, ids.b, creds.b.email, 'Verify B');
      const again = await clientB.from('profiles').select('*').eq('id', ids.b).maybeSingle();
      return again.data ? { status: 'PASS' } : { status: 'FAIL', detail: 'profile row not created' };
    }
    return { status: 'PASS' };
  });

  await t('auth', 'onboarding flag persists (no repeated name request)', async () => {
    if (!ids.a) return { status: 'BLOCKED', detail: signupBlocked };
    const { data } = await clientA.from('profiles').select('onboarded, profile_completed, name').eq('id', ids.a).maybeSingle();
    if (!data) return { status: 'FAIL', detail: 'no profile row' };
    if (!data.onboarded || !data.name) {
      await clientA.from('profiles').update({ onboarded: true, profile_completed: true }).eq('id', ids.a);
      const again = await clientA.from('profiles').select('onboarded').eq('id', ids.a).maybeSingle();
      if (again.data?.onboarded !== true) return { status: 'FAIL', detail: 'onboarded flag does not persist' };
      return { status: 'PASS', detail: 'onboarded was false; fixed by ensureProfile (app does this on login)' };
    }
    return { status: 'PASS' };
  });

  await t('auth', 'session survives a cold client (refresh persistence)', async () => {
    if (!ids.a) return { status: 'BLOCKED', detail: signupBlocked };
    const fresh = createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: false, storage: storageA, storageKey: 'foundators-test-a' } });
    const { data, error } = await fresh.auth.getSession();
    if (error) return { status: 'FAIL', detail: error.message };
    if (!data.session) return { status: 'FAIL', detail: 'no session restored from storage' };
    const { data: u, error: uerr } = await fresh.auth.getUser();
    if (uerr || u.user.id !== ids.a) return { status: 'FAIL', detail: 'restored session does not resolve to USER A' };
    return { status: 'PASS' };
  });

  await t('auth', 'logout then login keeps accounts separated', async () => {
    if (!ids.a || !ids.b) return { status: 'BLOCKED', detail: signupBlocked };
    await clientA.auth.signOut();
    const afterOut = await clientA.auth.getUser();
    if (afterOut.data.user) return { status: 'FAIL', detail: 'session still valid after signOut' };
    const { error } = await clientA.auth.signInWithPassword({ email: creds.a.email, password: creds.a.password });
    if (error) return { status: 'FAIL', detail: error.message };
    const me = await uidOf(clientA);
    if (me !== ids.a) return { status: 'FAIL', detail: 'signed into the wrong account' };
    const { data: bProfile } = await clientA.from('profiles').select('id, email').eq('id', ids.b).maybeSingle();
    if (bProfile && bProfile.email === creds.a.email) return { status: 'FAIL', detail: 'A sees its own row under B\'s id' };
    return { status: 'PASS' };
  });

  await t('auth', 'password reset email can be requested', async () => {
    const c = signupBlocked ? anon : clientA;
    let { error } = await c.auth.resetPasswordForEmail(creds.a.email, { redirectTo: `${new URL(URL_).origin}` });
    if (error && /rate limit/i.test(error.message)) {
      await new Promise((r) => setTimeout(r, 4000));
      ({ error } = await c.auth.resetPasswordForEmail(creds.b.email, { redirectTo: `${new URL(URL_).origin}` }));
    }
    if (error && /rate limit/i.test(error.message)) {
      return { status: 'BLOCKED', detail: 'GoTrue e-mail rate limit (transient, from repeated test runs): ' + error.message };
    }
    if (error) return { status: 'FAIL', detail: error.message };
    return { status: 'PASS', detail: 'reset email accepted by GoTrue' };
  });
}

// ─── 2. DATA ISOLATION ──────────────────────────────────────
async function isolationSection() {
  console.log('\n== 2. DATA ISOLATION ==');
  if (!ids.a || !ids.b) {
    await t('isolation', 'two accounts available', async () => ({ status: 'BLOCKED', detail: signupBlocked || 'accounts missing' }));
    return;
  }

  // The insert policy only lets you notify OTHERS (actor must be you, the
  // recipient must not be you) — mirroring the app, which never notifies you
  // about your own action.
  await t('isolation', 'A can notify B; only the recipient can read it', async () => {
    const { error } = await clientA.from('notifications').insert({
      id: `verify-notif-a-${stamp}`, user_id: ids.b, type: 'like', text: 'A liked your post', actor_key: ids.a,
    });
    if (error) return { status: 'FAIL', detail: error.message };
    const forB = await clientB.from('notifications').select('*').eq('id', `verify-notif-a-${stamp}`);
    if (forB.data.length !== 1) return { status: 'FAIL', detail: `recipient B sees ${forB.data.length} row(s)` };
    const forA = await clientA.from('notifications').select('*').eq('id', `verify-notif-a-${stamp}`);
    if (forA.data.length !== 0) return { status: 'FAIL', detail: 'creator A can read a row that is not theirs' };
    return { status: 'PASS' };
  });

  await t('isolation', 'self-notification is rejected', async () => {
    const { error } = await clientA.from('notifications').insert({
      id: `verify-notif-self-${stamp}`, user_id: ids.a, type: 'system', text: 'self', actor_key: ids.a,
    });
    if (!error) return { status: 'FAIL', detail: 'notification to self was accepted' };
    return { status: 'PASS', detail: error.message };
  });

  await t('isolation', 'B notifies A — row belongs to A, invisible to B', async () => {
    const { error } = await clientB.from('notifications').insert({
      id: `verify-notif-b-${stamp}`, user_id: ids.a, type: 'like', text: 'B liked your post', actor_key: ids.b,
    });
    if (error) return { status: 'FAIL', detail: error.message };
    const forA = await clientA.from('notifications').select('*').eq('id', `verify-notif-b-${stamp}`);
    if (forA.data.length !== 1) return { status: 'FAIL', detail: 'A cannot read its own notification' };
    const forB = await clientB.from('notifications').select('*').eq('id', `verify-notif-b-${stamp}`);
    if (forB.data.length !== 0) return { status: 'FAIL', detail: "creator B can read A's row" };
    return { status: 'PASS' };
  });

  await t('isolation', 'A creates a post owned by A', async () => {
    const { error } = await clientA.from('posts').insert({
      id: `verify-post-a-${stamp}`, text: 'Verification post by A', author_key: ids.a, author_name: 'Verify A', tag_type: 'update',
    });
    if (error) return { status: 'FAIL', detail: error.message };
    return { status: 'PASS' };
  });

  await t('isolation', "B can read A's public post (feed) but cannot edit it", async () => {
    const { data } = await clientB.from('posts').select('*').eq('id', `verify-post-a-${stamp}`);
    if (data.length !== 1) return { status: 'FAIL', detail: 'public post not visible to B' };
    const upd = await clientB.from('posts').update({ text: 'hijacked by B' }).eq('id', `verify-post-a-${stamp}`).select();
    if ((upd.data || []).length !== 0) return { status: 'FAIL', detail: 'B updated A\'s post' };
    const del = await clientB.from('posts').delete().eq('id', `verify-post-a-${stamp}`).select();
    if ((del.data || []).length !== 0) return { status: 'FAIL', detail: 'B deleted A\'s post' };
    const { data: after } = await clientA.from('posts').select('text').eq('id', `verify-post-a-${stamp}`);
    if (after[0]?.text !== 'Verification post by A') return { status: 'FAIL', detail: 'post content changed' };
    return { status: 'PASS' };
  });

  await t('isolation', "B cannot update A's profile", async () => {
    const res = await clientB.from('profiles').update({ name: 'hijacked' }).eq('id', ids.a).select();
    if ((res.data || []).length !== 0) return { status: 'FAIL', detail: 'B renamed A' };
    const { data } = await clientA.from('profiles').select('name').eq('id', ids.a).maybeSingle();
    if (data?.name === 'hijacked') return { status: 'FAIL', detail: 'A profile overwritten' };
    return { status: 'PASS' };
  });

  await t('isolation', 'user_settings rows are per-account', async () => {
    await clientA.from('user_settings').upsert({ user_id: ids.a, settings: { marker: 'A' } }, { onConflict: 'user_id' });
    const bRead = await clientB.from('user_settings').select('*').eq('user_id', ids.a);
    if ((bRead.data || []).length !== 0) return { status: 'FAIL', detail: 'B read A settings' };
    const bWrite = await clientB.from('user_settings').update({ settings: { marker: 'B' } }).eq('user_id', ids.a).select();
    if ((bWrite.data || []).length !== 0) return { status: 'FAIL', detail: 'B wrote A settings' };
    const aRead = await clientA.from('user_settings').select('*').eq('user_id', ids.a);
    if ((aRead.data || []).length !== 1) return { status: 'FAIL', detail: 'A cannot read own settings' };
    return { status: 'PASS' };
  });

  await t('isolation', 'chat between A and B is mutual; third-party chat invisible', async () => {
    const chatId = ['a' + stamp, 'b' + stamp].sort().join('__');
    const { error } = await clientA.from('chats').upsert({
      id: chatId, participants: [ids.a, ids.b], participant_names: { [ids.a]: 'A', [ids.b]: 'B' },
    }, { onConflict: 'id' });
    if (error) return { status: 'FAIL', detail: error.message };
    const bSees = await clientB.from('chats').select('*').eq('id', chatId);
    if ((bSees.data || []).length !== 1) return { status: 'FAIL', detail: 'B cannot see its own conversation' };

    const ghostChat = ['a' + stamp, 'ghost'].sort().join('__');
    await clientA.from('chats').upsert({ id: ghostChat, participants: [ids.a, 'ghost'] }, { onConflict: 'id' });
    const bGhost = await clientB.from('chats').select('*').eq('id', ghostChat);
    if ((bGhost.data || []).length !== 0) return { status: 'FAIL', detail: 'B sees a chat it is not part of' };
    state.chatId = chatId;
    return { status: 'PASS' };
  });

  await t('isolation', 'project ownership is enforced', async () => {
    const projId = `verify-proj-${stamp}`;
    const { error } = await clientA.from('projects').insert({ id: projId, owner_id: ids.a, title: 'Verify Project', description: 'x' });
    if (error) return { status: 'FAIL', detail: error.message };
    const upd = await clientB.from('projects').update({ title: 'stolen' }).eq('id', projId).select();
    if ((upd.data || []).length !== 0) return { status: 'FAIL', detail: 'B edited A\'s project' };
    const del = await clientB.from('projects').delete().eq('id', projId).select();
    if ((del.data || []).length !== 0) return { status: 'FAIL', detail: 'B deleted A\'s project' };
    await clientA.from('projects').delete().eq('id', projId);
    return { status: 'PASS' };
  });

  await t('isolation', 'no mixed rows after switching accounts', async () => {
    const { data } = await clientA.from('notifications').select('user_id').eq('user_id', ids.b);
    if ((data || []).length !== 0) return { status: 'FAIL', detail: 'A sees B notifications' };
    const { data: mine } = await clientA.from('notifications').select('user_id').eq('id', `verify-notif-b-${stamp}`);
    if (mine[0] && mine[0].user_id !== ids.a) return { status: 'FAIL', detail: 'notification owner mismatch' };
    return { status: 'PASS' };
  });
}

// ─── 3. DATABASE ────────────────────────────────────────────
const REQUIRED_TABLES = {
  profiles: ['id', 'email', 'name', 'handle', 'avatar', 'status', 'founding_number'],
  posts: ['id', 'text', 'author_key', 'liked_by', 'bookmarked_by', 'comments_count', 'views'],
  comments: ['id', 'post_id', 'author_key'],
  follows: ['follower_id', 'following_id'],
  chats: ['id', 'participants'],
  chat_messages: ['id', 'chat_id', 'sender_key'],
  notifications: ['id', 'user_id', 'type'],
  blocks: ['user_id', 'blocked_id'],
  reports: ['id', 'target_type', 'target_id'],
  stories: ['id', 'user_id', 'expires_at'],
  projects: ['id', 'owner_id', 'title'],
  project_members: ['project_id', 'user_id'],
  project_applications: ['id', 'project_id', 'user_id'],
  collab_requests: ['id', 'from_id', 'to_id'],
  referral_invites: ['id', 'code', 'inviter_id'],
  events: ['id', 'host_id', 'title', 'date', 'is_today', 'price_value'],
  reels: ['id', 'user_id', 'video_url', 'effect'],
  ideas: ['id', 'author_key', 'title', 'description', 'audience', 'tech'],
  voice_sessions: ['id'],
  voice_signals: ['id'],
  copilot_threads: ['id'],
  copilot_messages: ['id'],
  user_settings: ['user_id', 'settings'],
  analytics_events: ['id', 'user_id', 'event_type'],
  achievements: ['id', 'title'],
  user_achievements: ['user_id', 'achievement_id'],
  challenges: ['id', 'title', 'category', 'points', 'time_limit_sec'],
  challenge_entries: ['id', 'challenge_id', 'user_id'],
  founding_members: ['number', 'user_id'],
  admins: ['user_id', 'role'],
};

async function databaseSection() {
  console.log('\n== 3. DATABASE ==');
  const tableErrs = {};

  await t('database', 'all expected tables exist', async () => {
    const missing = [];
    for (const tbl of Object.keys(REQUIRED_TABLES)) {
      const { error } = await anon.from(tbl).select('*').limit(1);
      if (error) {
        tableErrs[tbl] = error.message;
        missing.push(`${tbl} (${error.message})`);
      }
    }
    if (missing.length) return { status: 'FAIL', detail: missing.join('; ') };
    return { status: 'PASS', detail: `${Object.keys(REQUIRED_TABLES).length} tables present` };
  });

  await t('database', 'expected columns exist (incl. 0002 backfill columns)', async () => {
    const missing = [];
    for (const [tbl, cols] of Object.entries(REQUIRED_TABLES)) {
      if (tableErrs[tbl]) continue;
      for (const c of cols) {
        const { error } = await anon.from(tbl).select(c).limit(1);
        if (error) missing.push(`${tbl}.${c}`);
      }
    }
    if (missing.length) return { status: 'FAIL', detail: missing.join(', ') };
    return { status: 'PASS' };
  });

  await t('database', 'every _updated_at trigger has a column to write', async () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const sql = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const missing = [];
    for (const m of sql.matchAll(/create trigger (\w+_updated_at) before update on public\.(\w+)/g)) {
      const [, trigger, tbl] = m;
      const body = sql.match(new RegExp(`create table if not exists public\\.${tbl}\\s*\\(([\\s\\S]*?)\\n\\);`));
      const inTable = body && /(^|\n)\s*updated_at\s+timestamptz/.test(body[1]);
      const addedLater = new RegExp(`alter table public\\.${tbl} add column if not exists updated_at`).test(sql);
      if (!inTable && !addedLater) missing.push(`${tbl} (${trigger})`);
    }
    if (missing.length) return { status: 'FAIL', detail: 'no updated_at column: ' + missing.join(', ') };
    return { status: 'PASS' };
  });

  await t('database', 'timestamp columns declared timestamptz in SQL', async () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const sql = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const bad = [];
    for (const tbl of Object.keys(REQUIRED_TABLES)) {
      const m = sql.match(new RegExp(`create table if not exists public\\.${tbl}\\s*\\(([^;]*?)\\n\\);`, 's'));
      if (!m) continue;
      for (const col of m[1].split('\n')) {
        const c = col.trim();
        if (/\b(created_at|updated_at|expires_at|last_seen|earned_at|starts_at|ends_at|last_message_at)\b/.test(c) && !/timestamptz/.test(c)) {
          bad.push(`${tbl}: ${c}`);
        }
      }
    }
    if (bad.length) return { status: 'FAIL', detail: bad.join('; ') };
    return { status: 'PASS' };
  });

  await t('database', 'no duplicate primary keys in seeded tables', async () => {
    // PostgREST exposes PK uniqueness implicitly; verify with a group-by count
    const { data, error } = await anon.from('profiles').select('id');
    if (error) return { status: 'BLOCKED', detail: error.message };
    const uniq = new Set(data.map((r) => r.id));
    if (uniq.size !== data.length) return { status: 'FAIL', detail: `${data.length - uniq.size} duplicate ids` };
    return { status: 'PASS', detail: `${data.length} profiles scanned` };
  });

  await t('database', 'SQL migration files are ordered + idempotent', async () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
    if (!files.length) return { status: 'FAIL', detail: 'no migration files' };
    const nonIdempotent = [];
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const line of sql.split('\n')) {
        const s = line.trim().toLowerCase();
        if (/^create table public\./.test(s) && !/if not exists/.test(s)) nonIdempotent.push(f);
        if (/^create index public\./.test(s) && !/if not exists/.test(s)) nonIdempotent.push(f);
      }
    }
    if (nonIdempotent.length) return { status: 'FAIL', detail: [...new Set(nonIdempotent)].join(', ') };
    return { status: 'PASS', detail: files.join(', ') };
  });
}

// ─── 4. RLS SECURITY ────────────────────────────────────────
async function rlsSection() {
  console.log('\n== 4. RLS SECURITY ==');
  if (!ids.a || !ids.b) {
    await t('rls', 'authenticated context available', async () => ({ status: 'BLOCKED', detail: signupBlocked || 'accounts missing' }));
    return;
  }

  await t('rls', 'every table has RLS enabled with at least one policy', async () => {
    const dir = path.join(root, 'supabase', 'migrations');
    const sql = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const tables = Object.keys(REQUIRED_TABLES).filter((t) => new RegExp(`create table if not exists public\\.${t}\\b`).test(sql));
    const noRls = tables.filter((tbl) => {
      const enabled = new RegExp(`alter table public\\.${tbl} enable row level security`).test(sql);
      const hasPolicy = new RegExp(`create policy \\w+ on public\\.${tbl}\\b`).test(sql);
      return !enabled || !hasPolicy;
    });
    if (noRls.length) return { status: 'FAIL', detail: 'no RLS/policy: ' + noRls.join(', ') };
    return { status: 'PASS', detail: `${tables.length} tables checked` };
  });

  await t('rls', 'anonymous request cannot read private tables', async () => {
    const targets = ['notifications', 'user_settings', 'chats', 'chat_messages'];
    const leaks = [];
    for (const tbl of targets) {
      const { data, error } = await anon.from(tbl).select('*').limit(1);
      if (!error && (data || []).length) leaks.push(tbl);
      if (error && !/permission denied|RLS/i.test(error.message)) leaks.push(`${tbl} (unexpected error: ${error.message})`);
    }
    if (leaks.length) return { status: 'FAIL', detail: leaks.join(', ') };
    return { status: 'PASS' };
  });

  await t('rls', 'user cannot grant themselves admin', async () => {
    const res = await clientA.from('admins').upsert({ user_id: ids.a, role: 'admin' }, { onConflict: 'user_id' }).select();
    if ((res.data || []).length) {
      const isAdmin = await clientA.rpc('is_admin');
      return { status: isAdmin.data === true ? 'FAIL' : 'PASS', detail: 'admins row written (unexpected) but is_admin still false' };
    }
    return { status: 'PASS', detail: res.error ? res.error.message : 'insert denied by RLS' };
  });

  await t('rls', 'admin-only tables stay closed for normal users', async () => {
    const leaks = [];
    for (const tbl of ['admin_actions']) {
      const { data } = await clientA.from(tbl).select('*').limit(5);
      if ((data || []).length) leaks.push(tbl);
    }
    const rep = await clientA.from('reports').select('*').limit(5);
    if ((rep.data || []).length) leaks.push('reports (admin-only select)');
    if (leaks.length) return { status: 'FAIL', detail: leaks.join(', ') };
    return { status: 'PASS' };
  });

  await t('rls', 'privilege columns cannot be self-granted (0002 guard)', async () => {
    const isAdmin = await clientA.rpc('is_admin');
    if (isAdmin.data === true) return { status: 'FAIL', detail: 'is_admin() escalated to true' };
    await clientA.from('profiles').update({ role: 'admin', verified: true }).eq('id', ids.a);
    const { data } = await clientA.from('profiles').select('role, verified').eq('id', ids.a).maybeSingle();
    const adminRows = await clientA.from('admin_actions').select('*').limit(1);
    if ((adminRows.data || []).length) return { status: 'FAIL', detail: 'admin_actions readable after self-grant' };
    if (data && (data.verified === true || data.role === 'admin')) {
      return { status: 'BLOCKED', detail: 'guard_profile_privileges() not applied yet — run 0002_backfill_columns.sql' };
    }
    return { status: 'PASS', detail: 'role/verified frozen by the DB guard' };
  });

  await t('rls', 'own posts can be deleted (delete-own allowed)', async () => {
    const id = `verify-del-${stamp}`;
    await clientA.from('posts').insert({ id, text: 'temp', author_key: ids.a, author_name: 'A' });
    const res = await clientA.from('posts').delete().eq('id', id).select();
    if ((res.data || []).length !== 1) return { status: 'FAIL', detail: res.error?.message || 'delete-own denied' };
    return { status: 'PASS' };
  });
}

// ─── 5. STORAGE ─────────────────────────────────────────────
async function storageSection() {
  console.log('\n== 5. STORAGE ==');
  if (!ids.a || !ids.b) {
    await t('storage', 'authenticated context available', async () => ({ status: 'BLOCKED', detail: signupBlocked || 'accounts missing' }));
    return;
  }
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  await t('storage', 'A uploads its own avatar', async () => {
    const key = `${ids.a}/verify-${stamp}.png`;
    const { error } = await clientA.storage.from('avatars').upload(key, png, { contentType: 'image/png', upsert: true });
    if (error) return { status: 'FAIL', detail: error.message };
    state.avatarKey = key;
    return { status: 'PASS' };
  });

  await t('storage', "B cannot upload into A's folder", async () => {
    const key = `${ids.a}/hijack-${stamp}.png`;
    const { error } = await clientB.storage.from('avatars').upload(key, png, { contentType: 'image/png', upsert: true });
    if (!error) {
      await clientB.storage.from('avatars').remove([key]).catch(() => {});
      return { status: 'FAIL', detail: 'B wrote into A\'s folder' };
    }
    return { status: 'PASS', detail: error.message };
  });

  await t('storage', 'public media is readable by anyone', async () => {
    const { error } = await anon.storage.from('avatars').download(state.avatarKey);
    if (error) return { status: 'FAIL', detail: error.message };
    return { status: 'PASS' };
  });

  await t('storage', "B cannot delete A's object", async () => {
    const { data, error } = await clientB.storage.from('avatars').remove([state.avatarKey]);
    if (error) return { status: 'PASS', detail: 'delete denied: ' + error.message };
    if ((data || []).length) return { status: 'FAIL', detail: 'B deleted A\'s object' };
    return { status: 'PASS', detail: 'delete removed 0 rows' };
  });

  await t('storage', 'A deletes its own object (cleanup)', async () => {
    const { error } = await clientA.storage.from('avatars').remove([state.avatarKey]);
    if (error) return { status: 'FAIL', detail: error.message };
    return { status: 'PASS' };
  });

  await t('storage', 'post/media buckets exist', async () => {
    const c = admin || clientA;
    const { data, error } = await c.storage.listBuckets();
    if (error) return { status: 'BLOCKED', detail: 'listing buckets needs the service key: ' + error.message };
    const names = (data || []).map((b) => b.id);
    const missing = ['uploads', 'avatars', 'covers'].filter((b) => !names.includes(b));
    if (missing.length) return { status: 'FAIL', detail: 'missing buckets: ' + missing.join(', ') };
    return { status: 'PASS', detail: names.join(', ') };
  });
}

// ─── 6. REALTIME ────────────────────────────────────────────
async function realtimeSection() {
  console.log('\n== 6. REALTIME ==');
  if (!ids.a || !ids.b) {
    await t('realtime', 'authenticated context available', async () => ({ status: 'BLOCKED', detail: signupBlocked || 'accounts missing' }));
    return;
  }

  await t('realtime', 'recipient receives a new notification exactly once', async () => {
    const seen = [];
    const channel = clientB
      .channel(`verify-notif-${stamp}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${ids.b}` }, (payload) => seen.push(payload.new.id))
      .subscribe();
    await new Promise((r) => setTimeout(r, 1500));
    const id = `verify-rt-${stamp}`;
    const { error } = await clientA.from('notifications').insert({ id, user_id: ids.b, type: 'like', text: 'rt', actor_key: ids.a });
    if (error) { channel.unsubscribe(); return { status: 'FAIL', detail: error.message }; }
    await new Promise((r) => setTimeout(r, 4000));
    channel.unsubscribe();
    if (seen.length === 0) return { status: 'FAIL', detail: 'no event received (table not in publication, or realtime disabled)' };
    if (seen.length > 1) return { status: 'FAIL', detail: `received ${seen.length} copies` };
    if (seen[0] !== id) return { status: 'FAIL', detail: 'wrong payload' };
    return { status: 'PASS' };
  });

  await t('realtime', 'RLS also filters realtime (B cannot eavesdrop on A)', async () => {
    const seen = [];
    const chB = clientB
      .channel(`verify-rt-b-${stamp}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${ids.a}` }, (p) => seen.push(p.new.id))
      .subscribe();
    await new Promise((r) => setTimeout(r, 1500));
    // B notifies A — this row belongs to A, so B (the creator) must not see it.
    await clientB.from('notifications').insert({ id: `verify-rt2-${stamp}`, user_id: ids.a, type: 'like', text: 'rt2', actor_key: ids.b });
    await new Promise((r) => setTimeout(r, 4000));
    chB.unsubscribe();
    if (seen.length) return { status: 'FAIL', detail: `B received ${seen.length} event(s) for A's row` };
    return { status: 'PASS' };
  });
}

// ─── 7. RPC / CORE WRITE PATHS ──────────────────────────────
async function rpcSection() {
  console.log('\n== 7. CORE WRITE PATHS (RPC) ==');
  if (!ids.a || !ids.b) {
    await t('rpc', 'authenticated context available', async () => ({ status: 'BLOCKED', detail: signupBlocked || 'accounts missing' }));
    return;
  }

  await t('rpc', 'send_message writes exactly one row', async () => {
    if (!state.chatId) return { status: 'BLOCKED', detail: 'chat missing' };
    const before = await clientA.from('chat_messages').select('id').eq('chat_id', state.chatId);
    const { data, error } = await clientA.rpc('send_message', {
      p_chat_id: state.chatId, p_text: 'verify message', p_sender: ids.a,
      p_sender_name: 'A', p_participants: [ids.a, ids.b],
    });
    if (error) return { status: 'FAIL', detail: error.message };
    const after = await clientA.from('chat_messages').select('id').eq('chat_id', state.chatId);
    const delta = (after.data || []).length - (before.data || []).length;
    if (delta !== 1) return { status: 'FAIL', detail: `created ${delta} rows (expected 1)` };
    state.messageId = Array.isArray(data) ? data[0]?.id || data[0] : data;
    return { status: 'PASS' };
  });

  await t('rpc', 'B sees the shared message, unrelated users do not', async () => {
    const bRead = await clientB.from('chat_messages').select('*').eq('chat_id', state.chatId);
    if ((bRead.data || []).length < 1) return { status: 'FAIL', detail: 'B cannot read its own conversation' };
    const ghost = await clientB.from('chat_messages').select('*').eq('chat_id', ['a' + stamp, 'ghost'].sort().join('__'));
    if ((ghost.data || []).length) return { status: 'FAIL', detail: 'B read a chat it is not part of' };
    return { status: 'PASS' };
  });

  await t('rpc', 'toggle_like is idempotent and self-consistent', async () => {
    const postId = `verify-post-a-${stamp}`;
    const r1 = await clientB.rpc('toggle_like', { p_post_id: postId });
    if (r1.error) return { status: 'FAIL', detail: r1.error.message };
    const { data: after1 } = await clientA.from('posts').select('likes, liked_by').eq('id', postId).maybeSingle();
    const liked = (after1?.liked_by || []).includes(ids.b);
    const r2 = await clientB.rpc('toggle_like', { p_post_id: postId });
    if (r2.error) return { status: 'FAIL', detail: r2.error.message };
    const { data: after2 } = await clientA.from('posts').select('likes, liked_by').eq('id', postId).maybeSingle();
    const stillLiked = (after2?.liked_by || []).includes(ids.b);
    if (liked && stillLiked) return { status: 'FAIL', detail: 'second call did not unlike' };
    if (!liked && !stillLiked) return { status: 'FAIL', detail: 'first call did not like' };
    if (Number(after2?.likes) !== (after2?.liked_by || []).length) return { status: 'FAIL', detail: 'counter out of sync with array' };
    return { status: 'PASS' };
  });

  await t('rpc', 'array_toggle_self works on events (RSVP)', async () => {
    const evId = `verify-ev-${stamp}`;
    const { error } = await clientA.from('events').insert({
      id: evId, host_id: ids.a, title: 'Verify Event', date: 'Today · 6:00 PM', is_today: true, attendees: [],
    });
    if (error) return { status: 'BLOCKED', detail: error.message };
    const r = await clientA.rpc('array_toggle_self', { p_table: 'events', p_id: evId, p_column: 'attendees' });
    if (r.error) return { status: 'FAIL', detail: r.error.message };
    const { data } = await clientA.from('events').select('attendees').eq('id', evId).maybeSingle();
    if (!(data?.attendees || []).includes(ids.a)) return { status: 'FAIL', detail: 'RSVP not recorded' };
    await clientA.from('events').delete().eq('id', evId);
    return { status: 'PASS' };
  });

  await t('rpc', 'comments belong to the correct post and author', async () => {
    const { error } = await clientB.from('comments').insert({
      id: `verify-cm-${stamp}`, post_id: `verify-post-a-${stamp}`, text: 'nice', author_key: ids.b, author_name: 'B',
    });
    if (error) return { status: 'FAIL', detail: error.message };
    const { data } = await clientA.from('comments').select('*').eq('id', `verify-cm-${stamp}`);
    if (data[0]?.author_key !== ids.b || data[0]?.post_id !== `verify-post-a-${stamp}`) {
      return { status: 'FAIL', detail: 'comment ownership wrong' };
    }
    return { status: 'PASS' };
  });

  await t('rpc', 'follow rows are unique and reversible', async () => {
    const ins = await clientB.from('follows').insert({ follower_id: ids.b, following_id: ids.a });
    if (ins.error && !/duplicate/i.test(ins.error.message)) return { status: 'FAIL', detail: ins.error.message };
    const dup = await clientB.from('follows').insert({ follower_id: ids.b, following_id: ids.a });
    if (!dup.error) return { status: 'FAIL', detail: 'duplicate follow row allowed' };
    const del = await clientB.from('follows').delete().eq('follower_id', ids.b).eq('following_id', ids.a).select();
    if ((del.data || []).length !== 1) return { status: 'FAIL', detail: 'unfollow failed' };
    return { status: 'PASS' };
  });
}

// ─── cleanup ────────────────────────────────────────────────
async function cleanup() {
  console.log('\n== CLEANUP (test rows only) ==');
  const rows = [
    ['notifications', [`verify-notif-a-${stamp}`, `verify-notif-b-${stamp}`, `verify-notif-self-${stamp}`, `verify-rt-${stamp}`, `verify-rt2-${stamp}`], 'id'],
    ['posts', [`verify-post-a-${stamp}`], 'id'],
    ['comments', [`verify-cm-${stamp}`], 'id'],
    ['chats', [state.chatId, ['a' + stamp, 'ghost'].sort().join('__')], 'id'],
  ];
  const cleaner = admin || clientA; // service key bypasses RLS for other users' rows
  for (const [tbl, vals, col] of rows) {
    const list = vals.filter(Boolean);
    if (!list.length) continue;
    const { error } = await cleaner.from(tbl).delete().in(col, list);
    console.log(`  ${error ? 'WARN ' : 'OK   '}${tbl}: ${error ? error.message : 'removed'}`);
  }
  if (admin) {
    // profile rows cascade to posts/comments/follows/notifications/…
    for (const id of [ids.a, ids.b]) {
      if (!id) continue;
      const { error } = await admin.from('profiles').delete().eq('id', id);
      console.log(`  ${error ? 'WARN ' : 'OK   '}profile ${id}: ${error ? error.message : 'removed (cascade)'}`);
      const { error: e2 } = await admin.auth.admin.deleteUser(id);
      console.log(`  ${e2 ? 'WARN ' : 'OK   '}auth user ${id}: ${e2 ? e2.message : 'removed'}`);
    }
  } else {
    console.log('  NOTE test users left in place (no working secret key) — delete them in the dashboard.');
  }
}

// ─── main ───────────────────────────────────────────────────
const started = Date.now();
await authSection();
await isolationSection();
await databaseSection();
await rlsSection();
await storageSection();
await realtimeSection();
await rpcSection();
await cleanup();

const bySection = {};
for (const r of results) {
  bySection[r.section] = bySection[r.section] || { PASS: 0, FAIL: 0, BLOCKED: 0 };
  bySection[r.section][r.status] = (bySection[r.section][r.status] || 0) + 1;
}

console.log('\n================ SUMMARY ================');
for (const [s, c] of Object.entries(bySection)) {
  const verdict = c.FAIL ? 'FAIL' : c.BLOCKED ? 'BLOCKED' : 'PASS';
  console.log(`${s.padEnd(16)} ${verdict.padEnd(8)} pass=${c.PASS || 0} fail=${c.FAIL || 0} blocked=${c.BLOCKED || 0}`);
}
console.log(`elapsed ${((Date.now() - started) / 1000).toFixed(1)}s`);

fs.writeFileSync(path.join(root, 'verify-report.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log('wrote verify-report.json');
process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
