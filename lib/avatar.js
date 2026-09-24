'use client';

const GRADIENTS = [
  ['#b8860b', '#f7dd8f'],
  ['#8a5cff', '#3b1f8f'],
  ['#2ecc71', '#1a8a4a'],
  ['#5b8dff', '#2a5ccc'],
  ['#e05297', '#a02362'],
  ['#ff8c42', '#d45d00'],
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Builds an inline SVG data-URI avatar with the first letter of the name.
// Same style as components/Avatar.js so fallbacks match the real product.
export function initialsAvatar(name = '') {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const [c1, c2] = GRADIENTS[hashName(name) % GRADIENTS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="80" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="80" font-weight="800" fill="#171100" text-anchor="middle" dominant-baseline="central">${letter}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}