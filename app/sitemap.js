// Keep the base URL in sync with metadataBase in app/layout.js.
const SITE_URL = 'https://foundators-flame.vercel.app';

const ROUTES = [
  ['', 1.0],
  ['/login', 0.6],
  ['/signup', 0.6],
  ['/home', 0.9],
  ['/discover', 0.8],
  ['/challenges', 0.8],
  ['/projects', 0.8],
  ['/ideas', 0.7],
  ['/events', 0.7],
  ['/reels', 0.7],
  ['/voice', 0.7],
  ['/opportunities', 0.6],
  ['/programmers', 0.6],
  ['/terms', 0.3],
  ['/privacy', 0.3],
];

export default function sitemap() {
  return ROUTES.map(([path, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' || path === '/home' ? 'daily' : 'weekly',
    priority,
  }));
}
