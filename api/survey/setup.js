// GET /api/survey/setup?key=<SETUP_SECRET>
// 설문 시트에 '설문응답'·'챌린지링크' 탭과 헤더를 최초 1회 만들어준다. 이미 있으면 건드리지 않는다(멱등).
// 실행 조건: 서비스 계정이 시트에 '편집자'로 공유되어 있어야 한다.

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

  try {
    const survey = await sheets.setupSurveySheet();
    return res.status(200).json({ ok: true, survey });
  } catch (err) {
    logError('survey/setup', err);
    return res.status(500).json({ ok: false, error: hint(err) });
  }
};

function hint(err) {
  const msg = err && err.message ? err.message : String(err);
  if (/permission|forbidden|403/i.test(msg)) {
    return `시트에 서비스 계정 이메일이 '편집자'로 공유되어 있는지 확인하세요. (${msg})`;
  }
  if (/not found|404/i.test(msg)) {
    return `시트를 찾을 수 없습니다. 시트 ID 또는 공유 설정을 확인하세요. (${msg})`;
  }
  return msg;
}
