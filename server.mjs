import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/workshop.js';

const config = JSON.parse(await readFile(new URL('./vercel.json', import.meta.url), 'utf8'));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/format.js', ['format.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

const server = createServer(async (req, res) => {
  for (const header of config.headers[0].headers) res.setHeader(header.key, header.value);
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400).end(); return; }
  if (pathname === '/api/workshop') return handler(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end('Method not allowed'); return; }
  const file = files.get(pathname);
  if (!file) { res.writeHead(404).end('Not found'); return; }
  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(500).end('Could not load the app.'); }
});

server.listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => {
  console.log(`Zomboid Loadout is running at http://localhost:${server.address().port}`);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
