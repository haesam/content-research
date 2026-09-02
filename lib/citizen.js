// 시민 확인 + 링크 조회: verify/submit 두 API가 공유하는 흐름
const sheets = require('./sheets');
const {
  findRosterMatches,
  pickChallengeLink,
  findExistingSubmission,
} = require('./survey');

// 명단 대조. 반환: { status: 'OK'|'NOT_FOUND'|'AMBIGUOUS', entry? }
async function resolveCitizen(name, phoneLast4) {
  const roster = await sheets.readRoster();
  const matches = findRosterMatches(roster, name, phoneLast4);
  if (matches.length === 0) return { status: 'NOT_FOUND' };
  if (matches.length > 1) return { status: 'AMBIGUOUS' };
  return { status: 'OK', entry: matches[0] };
}

// 같은 연락처로 이미 제출했는지
async function findPriorSubmission(entry) {
  const submitted = await sheets.readSurveySubmissions();
  return findExistingSubmission(submitted, entry.phone);
}

// 기수에 맞는 단톡 링크 (없으면 null)
async function resolveKakaoLink(cohort) {
  const links = await sheets.readChallengeLinks();
  return pickChallengeLink(links, cohort);
}

module.exports = { resolveCitizen, findPriorSubmission, resolveKakaoLink };
