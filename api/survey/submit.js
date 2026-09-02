// POST /api/survey/submit
// 요청: { name, phoneLast4, nickname, cohort, ageGroup, gender, region, major, promoLink,
//         educationHelp, currentConcern, effortAndLimit, communityExpectation, futureCommitment }
// 응답: { ok:true, kakaoLink|null, alreadySubmitted }
//       { ok:false, error: 'INVALID_INPUT'|'VALIDATION'|'NOT_FOUND'|'AMBIGUOUS'|'RATE_LIMITED'|'SERVER_ERROR', fields? }
// 제출 시점에도 명단을 다시 대조한다 (verify 단계를 우회한 직접 호출 방지).

const sheets = require('../../lib/sheets');
const { resolveCitizen, findPriorSubmission, resolveKakaoLink } = require('../../lib/citizen');
const { isValidName, isValidPhoneLast4, validateSurvey, buildSurveyRow, normalizeCohort } = require('../../lib/survey');
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

  const body = readJsonBody(req);
  const name = body.name;
  const phoneLast4 = String(body.phoneLast4 == null ? '' : body.phoneLast4).trim();
  if (!isValidName(name) || !isValidPhoneLast4(phoneLast4)) {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT' });
  }

  try {
    const result = await resolveCitizen(name, phoneLast4);
    if (result.status !== 'OK') {
      return res.status(403).json({ ok: false, error: result.status });
    }
    const entry = result.entry;

    // 명단에 기수가 있으면 그것이 우선, 없으면 수강생이 입력한 값
    const draft = Object.assign({}, body);
    if (entry.cohort) draft.cohort = entry.cohort;
    const v = validateSurvey(draft);
    if (!v.ok) {
      return res.status(400).json({ ok: false, error: 'VALIDATION', fields: v.errors });
    }
    const cohort = normalizeCohort(v.values.cohort);

    const prior = await findPriorSubmission(entry);
    if (prior) {
      const link = prior.kakaoLink || (await resolveKakaoLink(prior.cohort || cohort)) || null;
      return res.status(200).json({ ok: true, alreadySubmitted: true, kakaoLink: link });
    }

    const kakaoLink = await resolveKakaoLink(cohort);
    const row = buildSurveyRow({ rosterEntry: entry, values: v.values, cohort, kakaoLink, now: new Date() });
    await sheets.appendSurveyResponse(row);

    return res.status(200).json({ ok: true, alreadySubmitted: false, kakaoLink: kakaoLink || null });
  } catch (err) {
    logError('survey/submit', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
