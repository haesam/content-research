// 홈페이지 진단 도메인 로직 (구글시트 의존 없음 — 순수 함수만)
// STEP0(대상 선택) ~ STEP4(리포트)에 필요한 분기별 카피·문항·점수 계산을 모두 여기서 관리한다.
// 프런트엔드는 GET /api/diagnosis/config 로 이 모듈의 AXES/TARGETS를 그대로 내려받아 렌더링한다.

const { isValidPhone, digitsOnly, formatPhone, cleanText, formatKst } = require('./survey');

// ---------------------------------------------------------------------------
// 6개 축
// ---------------------------------------------------------------------------

const AXES = [
  { id: 'mobile', label: '모바일' },
  { id: 'impression', label: '첫인상' },
  { id: 'trust', label: '신뢰 신호' },
  { id: 'structure', label: '구조/동선' },
  { id: 'cta', label: '행동 유도' },
  { id: 'seo', label: '검색 노출' },
];

const AXIS_IDS = AXES.map((a) => a.id);

// ---------------------------------------------------------------------------
// 대상별 카피 + 문항 (기능상세서 v2, 섹션 2~6 반영)
// ---------------------------------------------------------------------------

const TARGETS = {
  church: {
    key: 'church',
    order: 1,
    icon: '⛪',
    label: '교회 / 성당',
    teaser: '왜 어떤 교회는 멀리서도 찾아올까요?',
    noun: '교회',
    scaleNoun: '비슷한 규모 교회',
    benchmark: 78,
    landing: {
      contrast: '왜 어떤 교회는 차 타고 30분 걸려도 찾아오고, 어떤 교회는 바로 앞 동네 사람도 안 올까요?',
      paradox: '현수막은 걸고, 전도지는 돌리시죠. 그런데 그보다 10배 많은 사람이 보는 온라인 성전은 몇 년째 그대로 두고 계시진 않나요?',
      loss: '이사 온 젊은 부부가 어젯밤 \'○○동 교회\'를 검색했습니다. 우리 교회 홈페이지를 3초 보고 창을 닫았다면, 그 가정은 다음 주일 다른 교회에 앉아 있습니다.',
      discover: [
        '새가족이 우리 교회를 검색했을 때 실제로 보는 첫 화면',
        '청년들이 등록 전에 떠나는 이탈 지점',
        '성장하는 교회들과 우리 교회의 격차 점수',
      ],
      closing: '성전은 매주 쓸고 닦습니다. 온라인 성전도 같은 대접을 받고 있나요?',
    },
    axisHooks: {
      mobile: '성도 10명 중 8명은 폰으로 봅니다. 화면이 깨지면 그날로 끝입니다.',
      impression: '왜 청년은 안 오고 어르신만 남을까요? 첫 화면에서 이미 갈립니다.',
      trust: '새가족의 첫 악수는 목사님이 아니라 홈페이지 첫 화면입니다.',
      structure: '예배 시간과 오시는 길, 3초 안에 보이나요?',
      cta: '검색해서 오는 사람이 현수막 보고 오는 사람보다 이미 많습니다.',
      seo: "'○○동 교회'로 검색해서 우리가 안 뜨면, 없는 교회입니다.",
    },
    axisQuestions: {
      mobile: [
        '스마트폰으로 홈페이지를 열었을 때 글씨나 사진이 깨지지 않고 잘 보이나요?',
        '폰 화면에서 예배시간·오시는 길 메뉴를 손가락으로 누르기 쉬운 크기인가요?',
      ],
      impression: [
        '홈페이지 디자인을 새로 고친 지 3년이 넘지 않았나요?',
        '처음 들어온 사람이 3초 안에 \'활동적인 교회\'라고 느낄 만한가요?',
      ],
      trust: [
        '담임목사님 소개, 교회 연혁, 최근 활동 사진이 홈페이지에 있나요?',
        '최근 1개월 이내 업데이트된 소식(주보·사진·공지)이 있나요?',
      ],
      structure: [
        '예배 시간과 오시는 길을 첫 화면에서 클릭 3번 이내로 찾을 수 있나요?',
        '새가족이 등록하거나 문의할 수 있는 방법이 눈에 잘 띄나요?',
      ],
      cta: [
        "'새가족 등록', '온라인 헌금', '문의하기' 같은 버튼이 명확히 있나요?",
        '전화 상담 말고도 카카오톡이나 문자로 편하게 문의할 방법이 있나요?',
      ],
      seo: [
        "네이버·구글에 '○○동 교회'를 검색하면 우리 교회가 첫 페이지에 나오나요?",
        '네이버지도·카카오맵에 교회 정보가 정확히 등록되어 있나요?',
      ],
    },
    report: {
      opening: "'왜 우리는 성장이 더딜까' 생각해보신 적 있으시죠. 답의 일부가 여기 있습니다.",
      scene: '지난달 우리 교회를 검색한 사람 중 몇 명이 첫 화면만 보고 그냥 닫았을까요? 그중 한 사람은 지금 다른 교회에 앉아 있을지도 모릅니다.',
      urgencyUnit: '새가족',
      traits: [
        '모바일 화면 최적화가 되어 있다',
        '최근 소식을 주 1회 이상 업데이트한다',
        '새가족 등록 버튼이 첫 화면 3초 안에 보인다',
      ],
    },
  },

  professional: {
    key: 'professional',
    order: 3,
    icon: '⚖️',
    label: '전문직 사무소 (노무사·회계사·변호사·세무사)',
    teaser: '왜 저 사무소는 소개 없이도 문의가 올까요?',
    noun: '사무소',
    scaleNoun: '문의가 꾸준한 사무소',
    benchmark: 76,
    landing: {
      contrast: '왜 옆 사무소는 소개 없이도 문의가 들어오고, 우리는 아는 사람 통해서만 일이 들어올까요?',
      paradox: '명함은 좋은 종이로 만드시죠. 그런데 하루에 명함보다 100배 많이 보여지는 검색 결과 속 우리 사무소는 어떤 모습인가요?',
      loss: "어젯밤 부당해고로 잠 못 이룬 사람이 '○○ 노무사'를 검색했습니다. 목록에 우리가 없었거나, 있어도 10년 전 홈페이지였다면 — 그 의뢰는 옆 사무소로 갔습니다.",
      discover: [
        '의뢰인이 선임 직전에 확인하는 신뢰 요소를 우리가 갖췄는지',
        '검색으로 들어온 사람이 연락을 포기하는 지점',
        '문의가 끊이지 않는 사무소들의 공통 구조',
      ],
      closing: '실력은 만나야 증명됩니다. 그런데 만나기 전에 걸러진다면요?',
    },
    axisHooks: {
      mobile: '의뢰인은 지하철에서 검색합니다. 폰에서 깨지면 신뢰도 깨집니다.',
      impression: "10년 된 디자인은 '일이 없는 사무소'로 읽힙니다.",
      trust: "선임 직전, 의뢰인은 반드시 '이 사람 믿을 만한가'를 확인합니다.",
      structure: '상담 신청까지 몇 번 클릭해야 하나요? 3번 넘으면 포기합니다.',
      cta: "전화번호만 있는 홈페이지는 '전화 못 하는 사람'을 전부 놓칩니다.",
      seo: '지역+직역으로 검색해서 안 뜨면, 시장에 존재하지 않는 겁니다.',
    },
    axisQuestions: {
      mobile: [
        '지하철이나 이동 중에 폰으로 사무소 홈페이지를 열었을 때 안 깨지고 잘 보이나요?',
        '상담 신청 버튼이 폰 화면에서 누르기 쉬운 크기와 위치에 있나요?',
      ],
      impression: [
        '홈페이지 디자인이 최근 3년 안에 새로 단장되었나요?',
        "처음 보는 사람이 '이 사무소는 일이 많고 잘 되는 곳'이라는 인상을 받을 만한가요?",
      ],
      trust: [
        '대표 변호사·노무사·회계사의 약력, 자격, 전문 분야가 명확히 나와 있나요?',
        '실제 처리 사례나 후기, 칼럼 등 신뢰를 뒷받침하는 콘텐츠가 있나요?',
      ],
      structure: [
        '상담 신청까지 클릭 3번 이내로 도달할 수 있나요?',
        '전문 분야별로 정보를 찾기 쉽게 메뉴가 정리되어 있나요?',
      ],
      cta: [
        '전화 말고도 카카오톡, 온라인 폼 등으로 상담 신청할 방법이 있나요?',
        "'무료 상담'처럼 부담 낮은 첫 행동 유도 장치가 있나요?",
      ],
      seo: [
        "'지역+직역'(예: 강남 노무사)으로 검색하면 우리 사무소가 첫 페이지에 나오나요?",
        '블로그·지도 등록 등으로 검색 노출을 꾸준히 관리하고 있나요?',
      ],
    },
    report: {
      opening: "'왜 소개 없이는 문의가 늘지 않을까' 생각해보신 적 있으시죠. 답의 일부가 여기 있습니다.",
      scene: '이번 달 우리 사무소를 검색한 사람 중 몇 명이 상담 신청 버튼을 찾지 못해 그냥 나갔을까요? 그 의뢰는 옆 사무소로 갔을 겁니다.',
      urgencyUnit: '의뢰',
      traits: [
        '전문 분야별로 정보가 정리되어 있다',
        '실제 사례·후기 콘텐츠를 보유하고 있다',
        '상담 신청까지 2클릭 이내로 도달한다',
      ],
    },
  },

  nonprofit: {
    key: 'nonprofit',
    order: 2,
    icon: '🤝',
    label: '비영리 / 단체',
    teaser: '왜 후원자는 큰 단체에만 몰릴까요?',
    noun: '단체',
    scaleNoun: '후원이 몰리는 단체',
    benchmark: 74,
    landing: {
      contrast: '왜 후원자는 늘 큰 단체에만 몰릴까요? 진짜 일 하는 건 우리인데요.',
      paradox: '후원 요청서는 몇 날을 다듬으시죠. 그런데 그 요청서를 받은 사람이 제일 먼저 하는 행동 — 단체명 검색 — 그 결과 화면은 누가 다듬고 있나요?',
      loss: "기업 담당자가 후원 검토 회의 전에 우리 단체를 검색했습니다. 홈페이지가 관리 안 된 걸 본 순간, '여기는 관리가 안 되는 곳'이라는 인상이 남습니다.",
      discover: [
        '후원자가 신뢰를 판단하는 5가지 신호 보유 여부',
        '후원 문의가 중간에 끊기는 구간',
        '후원이 몰리는 단체들의 홈페이지 공통점',
      ],
      closing: '투명성을 말씀하시죠. 홈페이지가 그 투명성을 보여주고 있나요?',
    },
    axisHooks: {
      mobile: '후원 버튼이 폰에서 안 눌린다면, 그 후원은 사라진 겁니다.',
      impression: "낡은 홈페이지는 '활동이 멈춘 단체'로 읽힙니다.",
      trust: '후원자는 돈을 주기 전에 반드시 어디에 쓰이는지 확인합니다.',
      structure: '후원하기까지 몇 단계인가요? 한 단계마다 절반이 떨어집니다.',
      cta: '후원 버튼 없는 홈페이지는 후원 의사를 그냥 흘려보냅니다.',
      seo: '단체명을 쳤을 때 기사만 뜨고 홈페이지가 없다면 신뢰가 흩어집니다.',
    },
    axisQuestions: {
      mobile: [
        '폰으로 후원 페이지를 열었을 때 글자와 후원 버튼이 깨지지 않고 잘 보이나요?',
        '후원하기 버튼이 폰 화면에서 누르기 쉬운 위치에 있나요?',
      ],
      impression: [
        '홈페이지 디자인이 최근 3년 안에 새로 단장되었나요?',
        "처음 방문한 사람이 '활발히 활동 중인 단체'라고 느낄 만한가요?",
      ],
      trust: [
        '사업 보고서, 회계 내역, 감사 결과 등 투명성 자료가 공개되어 있나요?',
        '실제 수혜자 사례나 활동 사진 등 신뢰를 뒷받침하는 콘텐츠가 있나요?',
      ],
      structure: [
        '후원하기까지 클릭 3번 이내로 도달할 수 있나요?',
        '단체 소개, 활동 내역을 찾기 쉽게 메뉴가 정리되어 있나요?',
      ],
      cta: [
        '정기후원·일시후원 등 후원 방법이 명확하게 안내되어 있나요?',
        '후원 문의를 카카오톡이나 이메일 등으로 편하게 할 수 있나요?',
      ],
      seo: [
        '단체명을 검색하면 홈페이지가 뉴스 기사보다 위 또는 근처에 뜨나요?',
        '네이버 등에 단체 정보(주소·연락처)가 정확히 등록되어 있나요?',
      ],
    },
    report: {
      opening: "'왜 우리는 후원이 늘지 않을까' 생각해보신 적 있으시죠. 답의 일부가 여기 있습니다.",
      scene: '이번 분기 우리 단체를 검색한 후원 후보 중 몇 명이 투명성 자료를 찾지 못해 후원을 미뤘을까요?',
      urgencyUnit: '후원자',
      traits: [
        '투명성 자료(회계·감사)가 공개되어 있다',
        '최근 활동 사진을 정기적으로 업데이트한다',
        '후원 버튼이 첫 화면에 바로 보인다',
      ],
    },
  },

  smb: {
    key: 'smb',
    order: 4,
    icon: '🏢',
    label: '소상공인 / 기타',
    teaser: '왜 손님이 검색하고도 안 올까요?',
    noun: '가게',
    scaleNoun: '단골이 꾸준한 가게',
    benchmark: 72,
    landing: {
      contrast: '왜 옆 가게는 검색만 해도 바로 찾아오고, 우리 가게는 검색해도 그냥 지나칠까요?',
      paradox: '간판은 새로 달고 전단지도 돌리시죠. 그런데 그보다 먼저 보는 검색 결과 속 우리 가게는 몇 년째 그대로 두고 계시진 않나요?',
      loss: "저녁 메뉴를 고민하던 손님이 '○○동 맛집'을 검색했습니다. 우리 가게 페이지를 3초 보고 나갔다면, 그 손님은 옆 가게로 갔습니다.",
      discover: [
        '손님이 검색했을 때 실제로 보는 첫 화면',
        '예약·문의 직전 손님이 이탈하는 지점',
        '잘되는 가게들과 우리 가게의 격차 점수',
      ],
      closing: '장사는 손님을 직접 맞이하는 일입니다. 온라인에서도 손님을 맞이할 준비가 되어 있나요?',
    },
    axisHooks: {
      mobile: '손님 대부분은 폰으로 검색합니다. 화면이 깨지면 그 손님은 그냥 나갑니다.',
      impression: "사진 한 장, 디자인 하나로 '깨끗한 가게'와 '오래된 가게'가 갈립니다.",
      trust: '후기와 실제 사진이 없으면 손님은 선뜻 문을 열고 들어오지 못합니다.',
      structure: '영업시간과 위치, 3초 안에 보이나요?',
      cta: '예약·문의 버튼 없는 페이지는 손님의 마음을 그냥 흘려보냅니다.',
      seo: "'○○동 + 업종'으로 검색해서 안 뜨면, 그 동네에 없는 가게입니다.",
    },
    axisQuestions: {
      mobile: [
        '폰으로 가게 홈페이지(또는 블로그·SNS)를 열었을 때 글씨나 사진이 잘 보이나요?',
        '예약이나 전화 버튼이 폰에서 누르기 쉬운 크기인가요?',
      ],
      impression: [
        '가게 사진이나 페이지 디자인이 최근 1~2년 안에 업데이트되었나요?',
        "처음 보는 손님이 '깨끗하고 믿을 만한 가게'라는 인상을 받을 만한가요?",
      ],
      trust: [
        '실제 손님 후기나 방문 사진이 눈에 띄게 있나요?',
        '메뉴·가격, 영업시간 같은 기본 정보가 정확하고 최신인가요?',
      ],
      structure: [
        '영업시간과 위치(지도)를 클릭 3번 이내로 찾을 수 있나요?',
        '예약이나 문의 방법이 첫 화면에서 바로 보이나요?',
      ],
      cta: [
        '전화 말고도 카카오톡 채널, 네이버 예약 등으로 편하게 문의할 수 있나요?',
        "'지금 예약하기' 같은 명확한 행동 유도 버튼이 있나요?",
      ],
      seo: [
        "'○○동 + 업종'으로 검색하면 우리 가게가 첫 페이지에 나오나요?",
        '네이버 플레이스·지도에 정보가 정확히 등록되고 관리되고 있나요?',
      ],
    },
    report: {
      opening: "'왜 검색은 되는데 손님은 안 늘까' 생각해보신 적 있으시죠. 답의 일부가 여기 있습니다.",
      scene: '오늘 저녁, 우리 가게를 검색한 손님 중 몇 명이 그냥 다른 곳으로 갔을까요?',
      urgencyUnit: '손님',
      traits: [
        '손님 후기가 상시 노출되어 있다',
        '네이버 플레이스 정보를 최신으로 관리한다',
        '예약 버튼이 첫 화면에 바로 보인다',
      ],
    },
  },
};

const TARGET_KEYS = Object.keys(TARGETS);

// ---------------------------------------------------------------------------
// 문항 구성 / 채점
// ---------------------------------------------------------------------------

function allQuestions(targetKey) {
  const t = TARGETS[targetKey];
  if (!t) return [];
  const list = [];
  for (const axis of AXES) {
    const texts = t.axisQuestions[axis.id] || [];
    texts.forEach((text, index) => {
      list.push({ axisId: axis.id, axisLabel: axis.label, index, text, key: `${axis.id}:${index}` });
    });
  }
  return list;
}

const ANSWER_VALUES = ['yes', 'no', 'unknown'];
const ANSWER_SCORE = { yes: 2, no: 1, unknown: 0 };

const GRADE_BANDS = [
  { min: 85, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 55, grade: 'C' },
  { min: 35, grade: 'D' },
  { min: 0, grade: 'F' },
];

function gradeFor(score) {
  const band = GRADE_BANDS.find((b) => score >= b.min);
  return band ? band.grade : 'F';
}

// answers: { "mobile:0": "yes", "mobile:1": "no", ... }
function validateAnswers(targetKey, answers) {
  const questions = allQuestions(targetKey);
  if (!questions.length) return { ok: false, error: 'INVALID_TARGET' };
  if (!answers || typeof answers !== 'object') return { ok: false, error: 'INVALID_ANSWERS' };
  for (const q of questions) {
    if (!ANSWER_VALUES.includes(answers[q.key])) return { ok: false, error: 'INVALID_ANSWERS' };
  }
  return { ok: true };
}

// 반환: { totalScore, grade, axisScores:{axisId:0~100}, weakestAxis, benchmark }
function computeReport(targetKey, answers) {
  const t = TARGETS[targetKey];
  if (!t) throw new Error('알 수 없는 진단 대상입니다.');
  const axisScores = {};
  let sumOfPct = 0;
  for (const axis of AXES) {
    const texts = t.axisQuestions[axis.id] || [];
    let sum = 0;
    texts.forEach((_, index) => {
      const v = answers[`${axis.id}:${index}`];
      sum += ANSWER_SCORE[v] != null ? ANSWER_SCORE[v] : 0;
    });
    const max = texts.length * 2;
    const pct = max ? Math.round((sum / max) * 100) : 0;
    axisScores[axis.id] = pct;
    sumOfPct += pct;
  }
  const totalScore = Math.round(sumOfPct / AXES.length);
  const weakestAxis = AXES.slice().sort((a, b) => axisScores[a.id] - axisScores[b.id])[0].id;
  return { totalScore, grade: gradeFor(totalScore), axisScores, weakestAxis, benchmark: t.benchmark };
}

// ---------------------------------------------------------------------------
// 리드(이름·연락처) 검증
// ---------------------------------------------------------------------------

const LEAD_FIELDS = [
  { key: 'name', label: '이름', required: true, max: 30 },
  { key: 'phone', label: '연락처', required: true, max: 20 },
  { key: 'org', label: '기관명', required: false, max: 100 },
  { key: 'interest', label: '관심 분야', required: false, max: 50 },
];

function validateLead(payload) {
  const errors = {};
  const values = {};
  for (const f of LEAD_FIELDS) {
    const v = cleanText(payload && payload[f.key], f.max);
    values[f.key] = v;
    if (f.required && !v) errors[f.key] = `${f.label}을(를) 입력해주세요.`;
  }
  if (values.phone && !isValidPhone(values.phone)) {
    errors.phone = '연락처는 숫자 10~11자리로 입력해주세요.';
  } else if (values.phone) {
    values.phone = formatPhone(values.phone);
  }
  return { ok: Object.keys(errors).length === 0, errors, values };
}

// ---------------------------------------------------------------------------
// 시트 저장용 행 조립
// ---------------------------------------------------------------------------

const DIAGNOSIS_COLUMNS = [
  { key: 'submittedAt', header: '제출일시' },
  { key: 'target', header: '대상유형' },
  { key: 'totalScore', header: '종합점수' },
  { key: 'grade', header: '등급' },
  { key: 'mobile', header: '모바일축점수' },
  { key: 'impression', header: '첫인상축점수' },
  { key: 'trust', header: '신뢰신호축점수' },
  { key: 'structure', header: '구조동선축점수' },
  { key: 'cta', header: '행동유도축점수' },
  { key: 'seo', header: '검색노출축점수' },
  { key: 'weakestAxis', header: '최저축' },
  { key: 'name', header: '이름' },
  { key: 'phone', header: '연락처' },
  { key: 'org', header: '기관명' },
  { key: 'interest', header: '관심분야' },
];

function buildDiagnosisRow({ target, report, lead, now }) {
  const axisLabel = (id) => (AXES.find((a) => a.id === id) || {}).label || id;
  const record = Object.assign({}, lead, {
    submittedAt: formatKst(now || new Date()),
    target: (TARGETS[target] || {}).label || target,
    totalScore: report.totalScore,
    grade: report.grade,
    weakestAxis: axisLabel(report.weakestAxis),
  });
  AXIS_IDS.forEach((id) => { record[id] = report.axisScores[id]; });
  return DIAGNOSIS_COLUMNS.map((c) => (record[c.key] == null ? '' : String(record[c.key])));
}

module.exports = {
  AXES,
  AXIS_IDS,
  TARGETS,
  TARGET_KEYS,
  ANSWER_VALUES,
  GRADE_BANDS,
  DIAGNOSIS_COLUMNS,
  allQuestions,
  gradeFor,
  validateAnswers,
  computeReport,
  validateLead,
  buildDiagnosisRow,
  // 재노출 (테스트/프런트 편의)
  digitsOnly,
  isValidPhone,
  formatPhone,
};
