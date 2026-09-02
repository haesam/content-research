// Vercel 서버리스 핸들러 공용 헬퍼

function readJsonBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string' && b.trim()) {
    try { return JSON.parse(b); } catch (_) { return {}; }
  }
  return {};
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

// 에러 로그에 요청 본문(개인정보)이 섞이지 않도록 메시지만 남긴다
function logError(scope, err) {
  const msg = err && err.message ? err.message : String(err);
  console.error(`[${scope}] ${msg}`);
}

module.exports = { readJsonBody, noStore, logError };
