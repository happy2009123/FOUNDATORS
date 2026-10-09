const fs = require('fs');
function labels(file) {
  const t = fs.readFileSync(file, 'utf8');
  return [...t.matchAll(/placeholder="([^"]+)"|aria-label="([^"]+)"/g)]
    .map((m) => m[1] || m[2])
    .filter((v, i, a) => a.indexOf(v) === i);
}
for (const f of [
  'app/settings/edit-profile/page.js',
  'app/create/page.js',
  'app/post/[postId]/page.js',
  'app/projects/new/page.js',
  'app/notifications/page.js',
  'app/onboarding/page.js',
]) {
  try { console.log('== ' + f + '\n  ' + labels(f).slice(0, 20).join(' | ')); }
  catch (e) { console.log('== ' + f + ' ERR ' + e.message); }
}
const n = fs.readFileSync('app/notifications/page.js', 'utf8');
console.log('notif markers:', (n.match(/followed|mentioned|liked|commented/g) || []).slice(0, 8).join(','));
