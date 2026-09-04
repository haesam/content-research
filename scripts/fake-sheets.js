// 로컬 개발/테스트용 가짜 구글시트. lib/sheets.js와 같은 함수 이름을 제공한다.
// 실제 구글 API를 호출하지 않으며, 메모리 안에서만 동작한다.

const { SURVEY_COLUMNS } = require('../lib/survey');

function createFakeSheets(seed = {}) {
  const state = {
    links: seed.links || [
      { cohort: '3기', link: 'https://open.kakao.com/o/fake-3gi', active: true },
      { cohort: '전체', link: '', active: true }, // 기본 링크 미입력 상태
    ],
    submissions: seed.submissions || [],
    setupCalls: [],
  };

  const idx = (key) => SURVEY_COLUMNS.findIndex((c) => c.key === key);

  return {
    state,
    async readChallengeLinks() { return state.links.map((l) => ({ ...l })); },
    async readSurveySubmissions() {
      return state.submissions.map((row) => ({
        cohort: row[idx('cohort')] || '',
        name: row[idx('name')] || '',
        phone: row[idx('phone')] || '',
        kakaoLink: row[idx('kakaoLink')] || '',
      }));
    },
    async appendSurveyResponse(row) { state.submissions.push(row.slice()); },
    async setupSurveySheet() { state.setupCalls.push('survey'); return { spreadsheetId: 'fake-survey', created: ['설문응답', '챌린지링크'], renamed: [], headersWritten: ['설문응답', '챌린지링크'], untouched: [] }; },
    // 기존 파이프라인 함수(사용 안 함)
    async readConfigKeywords() { return []; },
    async appendContentRows() {},
  };
}

// require 캐시에 가짜 모듈을 심어서, 이후 require('../lib/sheets')가 이 객체를 받게 한다
function installFakeSheets(fake) {
  const path = require.resolve('../lib/sheets');
  delete require.cache[path];
  require.cache[path] = { id: path, filename: path, loaded: true, exports: fake };
  return fake;
}

module.exports = { createFakeSheets, installFakeSheets };
