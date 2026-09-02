// POST /api/survey/verify
// 요청: { name, phoneLast4 }
// 응답: { ok:true, cohort, cohortLocked, phoneMasked, alreadySubmitted, kakaoLink? }
//       { ok:false, error: 'INVALID_INPUT'|'NOT_FOUND'|'AMBIGUOUS'|'RATE_LIMITED'|'SERVER_ERROR' }
// 명단의 원본 데이터(전체 연락처 등)는 절대 응답에 싣지 않는다.

const { resolveCitizen, findPriorSubmission, resolveKakaoLink } = require('../../lib/citizen');
const { isValidName, isValidPhoneLast4, maskPhone } = require('../../lib/survey');
const rate = require('../../lib/ratelimit');
const { readJsonBody, noStore, logError } = require('../../lib/http');

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const ip = rate.getClientIp(req);
  const rl = rate.check(`verify:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
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
      return res.status(200).json({ ok: false, error: result.status });
    }
    const entry = result.entry;
    const prior = await findPriorSubmission(entry);
    const payload = {
      ok: true,
      cohort: entry.cohort || '',
      cohortLocked: Boolean(entry.cohort),
      phoneMasked: maskPhone(entry.phone),
      alreadySubmitted: Boolean(prior),
    };
    if (prior) {
      // 이미 제출한 시민은 설문을 건너뛰고 바로 링크를 다시 볼 수 있다
      payload.kakaoLink = prior.kakaoLink || (await resolveKakaoLink(prior.cohort || entry.cohort)) || null;
    }
    return res.status(200).json(payload);
  } catch (err) {
    logError('survey/verify', err);
    return res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
};
