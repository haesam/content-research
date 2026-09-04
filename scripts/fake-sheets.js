// 로컬 개발/테스트용 가짜 구글시트. lib/sheets.js와 같은 함수 이름을 제공한다.
// 실제 구글 API를 호출하지 않으며, 메모리 안에서만 동작한다.

const { SURVEY_COLUMNS, DEFAULT_ROOMS } = require('../lib/survey');

function createFakeSheets(seed = {}) {
  const state = {
    // 기본값: 시트 양식 초기화 직후와 같은 상태 (내장 3개 방). seed.rooms 로 바꿀 수 있다.
    rooms: seed.rooms || DEFAULT_ROOMS.map((r) => ({ ...r })),
    submissions: seed.submissions || [],
    setupCalls: [],
  };

  const idx = (key) => SURVEY_COLUMNS.findIndex((c) => c.key === key);

  return {
    state,
    async readChallengeRooms() { return state.rooms.map((r) => ({ ...r })); },
    async readSurveySubmissions() {
      return state.submissions.map((row) => ({
        cohort: row[idx('cohort')] || '',
        name: row[idx('name')] || '',
        phone: row[idx('phone')] || '',
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
