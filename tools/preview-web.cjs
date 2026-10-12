const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../unpackage/dist/build/web');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const core=require('../netlify/lib/personnel-core.cjs');
const access=require('../netlify/functions/personnel-access.json');
const entries=new Map();let revision=0;
const store={async get(key){return entries.get(key)?.data||null;},async getWithMetadata(key){return entries.get(key)||null;},async getMetadata(key){return entries.has(key)?{}:null;},async set(key,data){entries.set(key,{data,etag:String(++revision)});},async setJSON(key,data,options={}){const old=entries.get(key);if(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch||options.onlyIfNew&&old)return {modified:false};entries.set(key,{data,etag:String(++revision)});return {modified:true};}};
http.createServer(async (request, response) => {
  if (request.url.startsWith('/.netlify/functions/personnel')) {
    try {
      let raw='';for await (const chunk of request){raw+=chunk;if(raw.length>5500000)throw Error('large');}
      const result=await core.handle({method:request.method,query:Object.fromEntries(new URL(request.url,'http://localhost').searchParams),authorization:request.headers.authorization,body:raw?JSON.parse(raw):null},store,access);
      response.writeHead(result.status,{'Content-Type':Buffer.isBuffer(result.body)?'application/octet-stream':'application/json','Cache-Control':'no-store'});
      response.end(result.status===304?'':Buffer.isBuffer(result.body)?result.body:JSON.stringify(result.body));
    }catch{response.writeHead(500);response.end('{"error":"本地预览请求失败"}');}
    return;
  }
  let relative;
  try { relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(Number(process.env.PORT||4173), '127.0.0.1', () => console.log('Preview server ready (local in-memory personnel only)'));
