// POST /api/diagnosis/submit
// 요청: { target: 'church'|'nonprofit'|'professional'|'smb',
//         answers: { "mobile:0": "yes"|"no"|"unknown", ... 대상의 전체 문항 },
//         lead: { name, phone, org?, interest? } }
// 응답: { ok:true, report:{ totalScore, grade, axisScores, weakestAxis, benchmark } }
//       { ok:false, error: 'VALIDATION'|'INVALID_TARGET'|'INVALID_ANSWERS'|'RATE_LIMITED'|'SHEET_NOT_READY'|'SERVER_ERROR', fields? }
// 점수는 서버에서 answers로부터 다시 계산해 저장한다(클라이언트 값을 그대로 믿지 않음).
// 진단리드 탭이 아직 없으면(초기화 전) 자동으로 만들고 이어서 저장한다.

const sheets = require('../../lib/sheets');
const diagnosis = require('../../lib/diagnosis');
const rate = require('../../lib/ratelimit');
const { readJsonBody, noStore, logError } = require('../../lib/http');

function isMissingTab(err) {
  return /unable to parse range|range.*not found/i.test(err && err.message ? err.message : '');
}
function isAccessProblem(err) {
  const m = err && err.message ? err.message : '';
  return /permission|forbidden|403|not found|404|GOOGLE_SERVICE_ACCOUNT_KEY|GOOGLE_DIAGNOSIS_SHEET_ID|invalid_grant|unauthorized/i.test(m);
}

async function appendWithSetup(row) {
  try {
    await sheets.appendDiagnosisLead(row);
  } catch (err) {
    if (!isMissingTab(err)) throw err;
    logError('diagnosis/submit', new Error('홈페이지진단리드 탭이 없어 자동 초기화합니다'));
    await sheets.setupDiagnosisSheet();
    await sheets.appendDiagnosisLead(row);
  }
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const ip = rate.getClientIp(req);
  const rl = rate.check(`diagnosis:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ ok: false, error: 'RATE_LIMITED', retryAfterSec: rl.retryAfterSec });
  }

  const body = readJsonBody(req);
  const target = String(body.target || '');
  if (!diagnosis.TARGETS[target]) {
    return res.status(400).json({ ok: false, error: 'INVALID_TARGET' });
  }

  const av = diagnosis.validateAnswers(target, body.answers);
  if (!av.ok) {
    return res.status(400).json({ ok: false, error: av.error });
  }

  const lv = diagnosis.validateLead(body.lead || {});
  if (!lv.ok) {
    return res.status(400).json({ ok: false, error: 'VALIDATION', fields: lv.errors });
  }

  const report = diagnosis.computeReport(target, body.answers);

  try {
    const row = diagnosis.buildDiagnosisRow({ target, report, lead: lv.values, now: new Date() });
    await appendWithSetup(row);
    return res.status(200).json({ ok: true, report });
  } catch (err) {
    logError('diagnosis/submit', err);
    const code = isAccessProblem(err) ? 'SHEET_NOT_READY' : 'SERVER_ERROR';
    return res.status(500).json({ ok: false, error: code });
  }
};
