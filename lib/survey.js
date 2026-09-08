// 설문 도메인 로직 (구글시트 의존 없음 — 순수 함수만)

// 설문응답 탭의 열 순서. 시트 헤더와 buildSurveyRow()가 이 순서를 공유한다.
const SURVEY_COLUMNS = [
  { key: 'submittedAt', header: '제출일시' },
  { key: 'cohort', header: '기수' },
  { key: 'name', header: '성함' },
  { key: 'nickname', header: '닉네임' },
  { key: 'phone', header: '연락처' },
  { key: 'ageGroup', header: '연령대' },
  { key: 'gender', header: '성별' },
  { key: 'region', header: '지역' },
  { key: 'major', header: '전공' },
  { key: 'promoLink', header: '홍보·영업 문의용 링크' },
  { key: 'educationHelp', header: '교육에서 도움된 점 및 구체적인 성과(수익)' },
  { key: 'currentConcern', header: '현재 고민' },
  { key: 'effortAndLimit', header: '시도해본 노력과 한계' },
  { key: 'communityExpectation', header: '이후 커뮤니티에서 바라는 점' },
  { key: 'futureCommitment', header: '앞으로의 다짐' },
  { key: 'rooms', header: '안내된 단톡방' },
];

// 수강생이 입력하는 항목
const SURVEY_FIELDS = [
  { key: 'name', label: '성함', required: true, max: 30 },
  { key: 'nickname', label: '닉네임', required: false, max: 50 },
  { key: 'cohort', label: '기수', required: true, max: 30 },
  { key: 'phone', label: '연락처', required: true, max: 20 },
  { key: 'ageGroup', label: '연령대', required: true, max: 30 },
  { key: 'gender', label: '성별', required: true, max: 20 },
  { key: 'region', label: '지역', required: true, max: 50 },
  { key: 'major', label: '전공', required: true, max: 100 },
  { key: 'promoLink', label: '홍보·영업 문의용 링크', required: true, max: 1000 },
  { key: 'educationHelp', label: '교육에서 도움된 점 및 구체적인 성과(수익)', required: true, max: 3000 },
  { key: 'currentConcern', label: '현재 고민', required: true, max: 3000 },
  { key: 'effortAndLimit', label: '시도해본 노력과 한계', required: true, max: 3000 },
  { key: 'communityExpectation', label: '이후 커뮤니티에서 바라는 점', required: true, max: 3000 },
  { key: 'futureCommitment', label: '앞으로의 다짐', required: true, max: 3000 },
];

// 제출 후 안내할 단톡방. 시트의 챌린지링크 탭이 비어 있거나 읽을 수 없을 때 이 목록을 쓴다.
// (시트 양식 초기화 때 이 값이 그대로 채워진다)
const DEFAULT_ROOMS = [
  { name: '콘텐츠 챌린지 단톡방', link: 'https://open.kakao.com/o/guCDOQLi', password: '2631', active: true },
  { name: '제작 챌린지 단톡방', link: 'https://open.kakao.com/o/gpPEPQLi', password: '2631', active: true },
  { name: '영업 챌린지 단톡방', link: 'https://open.kakao.com/o/gV49PQLi', password: '2631', active: true },
];

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeCohort(value) {
  return String(value || '').normalize('NFC').trim();
}

function cleanText(value, max) {
  const s = String(value == null ? '' : value).normalize('NFC').replace(/\r\n/g, '\n').trim();
  return typeof max === 'number' ? s.slice(0, max) : s;
}

// 휴대폰 번호: 숫자 10~11자리, 0으로 시작
function isValidPhone(value) {
  const d = digitsOnly(value);
  return /^0\d{9,10}$/.test(d);
}

// 저장용 표기: 010-1234-5678 형태로 통일
function formatPhone(value) {
  const d = digitsOnly(value);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

// 활성 상태이고 링크가 있는 방만, 응답에 실을 형태로 정리
function activeRooms(rooms) {
  return (rooms || [])
    .filter((r) => r && r.active !== false && String(r.link || '').trim())
    .map((r) => ({
      name: String(r.name || '').trim() || '챌린지 단톡방',
      link: String(r.link).trim(),
      password: String(r.password == null ? '' : r.password).trim(),
    }));
}

// 설문 본문 검증. 반환: { ok, errors: {key: message}, values: 정제된 값 }
function validateSurvey(payload) {
  const errors = {};
  const values = {};
  for (const f of SURVEY_FIELDS) {
    const v = cleanText(payload && payload[f.key], f.max);
    values[f.key] = v;
    if (f.required && !v) errors[f.key] = `${f.label}을(를) 입력해주세요.`;
  }
  if (values.phone && !isValidPhone(values.phone)) {
    errors.phone = '연락처는 숫자 10~11자리로 입력해주세요.';
  } else if (values.phone) {
    values.phone = formatPhone(values.phone);
  }
  values.name = values.name.replace(/\s+/g, ' ');
  values.cohort = normalizeCohort(values.cohort);
  return { ok: Object.keys(errors).length === 0, errors, values };
}

// KST 기준 'YYYY-MM-DD HH:mm:ss'
function formatKst(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}:${p(kst.getUTCSeconds())}`;
}

function buildSurveyRow({ values, rooms, now }) {
  const record = Object.assign({}, values, {
    submittedAt: formatKst(now || new Date()),
    rooms: (rooms || []).map((r) => r.name).join(', '),
  });
  return SURVEY_COLUMNS.map((c) => record[c.key] == null ? '' : String(record[c.key]));
}

// 설문응답 탭에서 같은 연락처(숫자만 비교)로 이미 제출한 행이 있는지
function findExistingSubmission(submittedRows, phone) {
  const d = digitsOnly(phone);
  if (!d) return null;
  return (submittedRows || []).find((r) => digitsOnly(r.phone) === d) || null;
}

module.exports = {
  SURVEY_COLUMNS,
  SURVEY_FIELDS,
  DEFAULT_ROOMS,
  normalizeCohort,
  digitsOnly,
  cleanText,
  isValidPhone,
  formatPhone,
  activeRooms,
  validateSurvey,
  formatKst,
  buildSurveyRow,
  findExistingSubmission,
};
