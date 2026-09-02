// 아주 단순한 인메모리 요청 제한기.
// 서버리스 인스턴스마다 따로 동작하므로 완전한 보호는 아니지만,
// 이름+뒷번호를 무작위로 찔러보는 시도를 눈에 띄게 늦춰준다.

const buckets = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (req.headers['x-real-ip']) return String(req.headers['x-real-ip']);
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// 반환: { allowed, retryAfterSec }
function check(key, { limit = 10, windowMs = 10 * 60 * 1000 } = {}, now = Date.now()) {
  let b = buckets.get(key);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    // 오래된 버킷 정리
    for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k);
  }
  if (b.count > limit) {
    return { allowed: false, retryAfterSec: Math.ceil((b.start + windowMs - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function reset() {
  buckets.clear();
}

module.exports = { getClientIp, check, reset };
