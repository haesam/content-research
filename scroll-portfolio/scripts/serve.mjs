// 의존성 없는 정적 서버. 사용: node scripts/serve.mjs [port=8080]
import http from 'node:http'; import { createReadStream, statSync } from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname), port = +(process.argv[2] || 8080);
const mime = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4' };
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  try { if (statSync(p).isDirectory()) p = path.join(p, 'index.html'); statSync(p); } catch { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  createReadStream(p).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}/  (녹화용: http://localhost:${port}/?record=1)`));
