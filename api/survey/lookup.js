// POST /api/survey/lookup
// 요청: { name, phone }
// 응답: { ok:true, found:false }
//       { ok:true, found:true, rooms: [{ name, link, password }] }  ← 이미 제출한 시민: 설문을 건너뛰고 바로 단톡방 안내
// 성함(공백 무시)과 연락처(숫자만 비교)가 모두 기존 제출과 일치할 때만 found.

const sheets = require('../../lib/sheets');
const { isValidPhone, digitsOnly, cleanText, activeRooms, DEFAULT_ROOMS } = require('../../lib/survey');
const rate = require('../../lib/ratelimit');
const { readJsonBody, noStore, logError } = require('../../lib/http');

function squash(name) {
  return cleanText(name, 30).replace(/\s+/g, '');
}

async function loadRooms() {
  try {
    const rows = await sheets.readChallengeRooms();
    if (rows.length) return activeRooms(rows);
  } catch (err) {
    logError('survey/lookup:rooms', err);
  }
  return activeRooms(DEFAULT_ROOMS);
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const ip = rate.getClientIp(req);
  const rl = rate.check(`lookup:${ip}`, { limit: 15, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec });
  }

  const body = readJsonBody(req);
  const name = squash(body.name);
  const phone = digitsOnly(body.phone);
  if (!name || !isValidPhone(phone)) {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
  }

  try {
    let submitted;
    try {
      submitted = await sheets.readSurveySubmissions();
    } catch (err) {
      // 탭이 아직 없으면(초기화 전) 제출 기록도 없는 것
      if (/unable to parse range|range.*not found/i.test(err.message || '')) submitted = [];
      else throw err;
    }
    const hit = submitted.find((r) => digitsOnly(r.phone) === phone && squash(r.name) === name);
    if (!hit) return res.status(200).json({ ok: true, found: false });
    const rooms = await loadRooms();
    return res.status(200).json({ ok: true, found: true, rooms });
  } catch (err) {
    logError('survey/lookup', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
