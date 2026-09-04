// POST /api/survey/submit
// 요청: { name, nickname, cohort, phone, ageGroup, gender, region, major, promoLink,
//         educationHelp, currentConcern, effortAndLimit, communityExpectation, futureCommitment }
// 응답: { ok:true, alreadySubmitted, rooms: [{ name, link, password }] }
//       { ok:false, error: 'VALIDATION'|'RATE_LIMITED'|'SERVER_ERROR', fields? }
// 같은 연락처로 이미 제출한 경우 새 행을 추가하지 않고 단톡방 목록만 다시 돌려준다.

const sheets = require('../../lib/sheets');
const { validateSurvey, buildSurveyRow, activeRooms, findExistingSubmission, DEFAULT_ROOMS } = require('../../lib/survey');
const rate = require('../../lib/ratelimit');
const { readJsonBody, noStore, logError } = require('../../lib/http');

// 챌린지링크 탭에 행이 있으면 그것을, 탭이 비어 있거나 읽을 수 없으면 코드에 내장된 기본 목록을 쓴다.
// (행은 있는데 전부 비활성이면 빈 목록 → 화면에 "준비 중" 안내)
async function loadRooms() {
  try {
    const rows = await sheets.readChallengeRooms();
    if (rows.length) return activeRooms(rows);
  } catch (err) {
    logError('survey/submit:rooms', err);
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
  const rl = rate.check(`submit:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec });
  }

  const v = validateSurvey(readJsonBody(req));
  if (!v.ok) {
    return res.status(400).json({ ok: false, error: 'VALIDATION', fields: v.errors });
  }

  try {
    const submitted = await sheets.readSurveySubmissions();
    const prior = findExistingSubmission(submitted, v.values.phone);
    const rooms = await loadRooms();

    if (prior) {
      return res.status(200).json({ ok: true, alreadySubmitted: true, rooms });
    }

    const row = buildSurveyRow({ values: v.values, rooms, now: new Date() });
    await sheets.appendSurveyResponse(row);

    return res.status(200).json({ ok: true, alreadySubmitted: false, rooms });
  } catch (err) {
    logError('survey/submit', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
