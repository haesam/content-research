// 로컬에서 사이트 + API를 함께 띄운다 (구글 인증 없이, 가짜 시트 사용).
//   node scripts/dev-server.js            → http://localhost:3000
//   PORT=4000 node scripts/dev-server.js
// 실제 시트로 돌려보려면 `vercel dev`를 쓰거나 REAL_SHEETS=1 + 환경변수를 넣는다.

const http = require('http');
const fs = require('fs');
const path = require('path');

if (!process.env.REAL_SHEETS) {
  const { createFakeSheets, installFakeSheets } = require('./fake-sheets');
  installFakeSheets(createFakeSheets());
  process.env.SETUP_SECRET = process.env.SETUP_SECRET || 'dev-secret';
}

const handlers = {
  '/api/survey/verify': require('../api/survey/verify'),
  '/api/survey/submit': require('../api/survey/submit'),
  '/api/survey/setup': require('../api/survey/setup'),
};

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// Vercel 서버리스 런타임이 해주는 것들을 흉내낸다: req.body/req.query, res.status().json()
function shim(req, res, body) {
  const u = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(u.searchParams.entries());
  if (body && (req.headers['content-type'] || '').includes('application/json')) {
    try { req.body = JSON.parse(body); } catch (_) { req.body = body; }
  } else {
    req.body = body;
  }
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return res; };
  res.send = (s) => { res.end(s); return res; };
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (handlers[pathname]) {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      shim(req, res, body);
      try { await handlers[pathname](req, res); }
      catch (e) { res.statusCode = 500; res.end('handler crashed: ' + e.message); }
    });
    return;
  }
  let file = pathname === '/' ? '/index.html' : pathname;
  file = path.normalize(path.join(PUBLIC_DIR, file));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; return res.end('not found');
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`dev server: http://localhost:${PORT}  (${process.env.REAL_SHEETS ? '실제 시트' : '가짜 시트'})`);
});
