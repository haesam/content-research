// GET /api/survey/setup?key=<SETUP_SECRET>
// 두 구글시트에 탭과 헤더를 최초 1회 만들어준다. 이미 있으면 건드리지 않는다(멱등).
// 실행 조건: 서비스 계정이 두 시트 모두에 '편집자'로 공유되어 있어야 한다.
// (수강생 명단 시트는 세팅이 끝난 뒤 '뷰어'로 낮추면 된다)

const sheets = require('../../lib/sheets');
const { noStore, logError } = require('../../lib/http');

function extractKey(req) {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (req.query && req.query.key) return String(req.query.key);
  try {
    const u = new URL(req.url, 'http://localhost');
    return u.searchParams.get('key') || '';
  } catch (_) {
    return '';
  }
}

module.exports = async function handler(req, res) {
  noStore(res);
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'SETUP_SECRET 환경변수를 먼저 설정하세요.' });
  }
  if (extractKey(req) !== secret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const out = { ok: true, roster: null, survey: null, errors: {} };
  try {
    out.roster = await sheets.setupRosterSheet();
  } catch (err) {
    logError('survey/setup:roster', err);
    out.ok = false;
    out.errors.roster = hint(err, '수강생 명단');
  }
  try {
    out.survey = await sheets.setupSurveySheet();
  } catch (err) {
    logError('survey/setup:survey', err);
    out.ok = false;
    out.errors.survey = hint(err, '챌린지신청자');
  }
  return res.status(out.ok ? 200 : 500).json(out);
};

function hint(err, sheetName) {
  const msg = err && err.message ? err.message : String(err);
  if (/permission|forbidden|403/i.test(msg)) {
    return `${sheetName} 시트에 서비스 계정 이메일이 '편집자'로 공유되어 있는지 확인하세요. (${msg})`;
  }
  if (/not found|404/i.test(msg)) {
    return `${sheetName} 시트를 찾을 수 없습니다. 시트 ID 또는 공유 설정을 확인하세요. (${msg})`;
  }
  return msg;
}
