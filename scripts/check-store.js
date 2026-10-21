const fs = require('fs');
const { execSync } = require('child_process');
const store = fs.readFileSync('lib/store.js', 'utf8');
const files = execSync('git grep -l useStore -- app components lib', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const missing = [];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  for (const m of c.matchAll(/useStore\(\(s\) => s\.([a-zA-Z_]+)/g)) {
    const k = m[1];
    const exists = new RegExp(`\\b${k}\\s*[:(=,]`).test(store) || new RegExp(`\\b${k}\\s*,`).test(store);
    if (!exists) missing.push(`${k}  <-  ${f}`);
  }
}
console.log(missing.length ? 'MISSING SELECTORS:\n' + missing.join('\n') : 'all store selectors exist');
