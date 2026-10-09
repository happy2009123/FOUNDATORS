const fs = require('fs');
const chat = fs.readFileSync('app/messages/[chatId]/page.js', 'utf8');
const lines = chat.split(/\r?\n/);
lines.forEach((l, i) => {
  if (/onKeyDown|key === 'Enter'|<Send|handleSend|Type a message/.test(l))
    console.log('chat:' + (i + 1) + ': ' + l.trim().slice(0, 150));
});
const login = fs.readFileSync('app/login/page.js', 'utf8');
console.log('login:', [...login.matchAll(/aria-label="([^"]+)"|placeholder="([^"]+)"/g)]
  .map((m) => m[1] || m[2]).slice(0, 14).join(' | '));
console.log('login btn:', (login.match(/>[^<]*(Log ?in|Sign ?in)[^<]*</g) || []).slice(0, 4).join(' , '));
