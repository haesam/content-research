// POST /api/survey/submit
// 요청: { name, nickname, cohort, phone, ageGroup, gender, region, major, promoLink,
//         educationHelp, currentConcern, effortAndLimit, communityExpectation, futureCommitment }
// 응답: { ok:true, kakaoLink|null, alreadySubmitted }
//       { ok:false, error: 'VALIDATION'|'RATE_LIMITED'|'SERVER_ERROR', fields? }
// 같은 연락처로 이미 제출한 경우 새 행을 추가하지 않고 기존 링크를 돌려준다.

const sheets = require('../../lib/sheets');
const { validateSurvey, buildSurveyRow, pickChallengeLink, findExistingSubmission } = require('../../lib/survey');
const rate = require('../../lib/ratelimit');
const { readJsonBody, noStore, logError } = require('../../lib/http');

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
    const links = await sheets.readChallengeLinks();

    if (prior) {
      const link = prior.kakaoLink || pickChallengeLink(links, prior.cohort || v.values.cohort) || null;
      return res.status(200).json({ ok: true, alreadySubmitted: true, kakaoLink: link });
    }

    const kakaoLink = pickChallengeLink(links, v.values.cohort);
    const row = buildSurveyRow({ values: v.values, kakaoLink, now: new Date() });
    await sheets.appendSurveyResponse(row);

    return res.status(200).json({ ok: true, alreadySubmitted: false, kakaoLink: kakaoLink || null });
  } catch (err) {
    logError('survey/submit', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
