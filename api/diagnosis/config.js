// GET /api/diagnosis/config
// 진단 화면(STEP0~4) 렌더링에 필요한 대상별 카피·문항·축 정보를 그대로 내려준다.
// 개인정보나 비밀이 아니므로 인증 없이 열어두고 짧게 캐시한다.

const diagnosis = require('../../lib/diagnosis');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({
    ok: true,
    axes: diagnosis.AXES,
    targets: diagnosis.TARGETS,
    gradeBands: diagnosis.GRADE_BANDS,
  });
};
