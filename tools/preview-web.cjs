const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../unpackage/dist/build/web');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer((request, response) => {
  let relative;
  try { relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173'));
