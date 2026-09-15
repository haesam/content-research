// GET /api/diagnosis/health?key=<SETUP_SECRET>
// 배포가 제대로 됐는지 브라우저에서 바로 확인하는 진단 페이지.
// 환경변수, 시트 접근 권한, 탭 존재 여부를 점검하고 각 항목에 대해 해결 방법을 알려준다.
// 리드 개인정보는 절대 포함하지 않는다.

const sheets = require('../../lib/sheets');
const { noStore, logError } = require('../../lib/http');

function extractKey(req) {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (req.query && req.query.key) return String(req.query.key);
  try {
    return new URL(req.url, 'http://localhost').searchParams.get('key') || '';
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
    const report = await sheets.checkDiagnosisSheet();
    return res.status(report.ok ? 200 : 500).json(report);
  } catch (err) {
    logError('diagnosis/health', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
