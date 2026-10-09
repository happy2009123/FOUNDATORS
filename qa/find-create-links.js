const fs = require('fs');
const path = require('path');
function walk(d, out) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(f)) out.push(p);
  }
  return out;
}
const files = walk('components', []).concat(walk('app', []));
const re1 = /href=["'`][^"'`]*create/;
const re2 = /push\(["'`]\/create/;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    if (re1.test(l) || re2.test(l)) console.log(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 130));
  });
}
