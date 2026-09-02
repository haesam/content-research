const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../lib/survey');

test('normalizeName removes whitespace and unifies unicode', () => {
  assert.equal(s.normalizeName(' 홍 길동 '), '홍길동');
  assert.equal(s.normalizeName('한글'.normalize('NFD')), '한글');
});

test('last4 takes digits only', () => {
  assert.equal(s.last4('010-1234-5678'), '5678');
  assert.equal(s.last4('01012345678'), '5678');
  assert.equal(s.last4('+82 10 1234 5678'), '5678');
});

test('findRosterMatches requires exact name and phone tail', () => {
  const roster = [
    { name: '홍길동', phone: '010-1234-5678', cohort: '3기' },
    { name: '홍길동', phone: '010-0000-9999', cohort: '3기' },
    { name: '김영희', phone: '010-9999-5678', cohort: '' },
  ];
  assert.equal(s.findRosterMatches(roster, '홍 길동', '5678').length, 1);
  assert.equal(s.findRosterMatches(roster, '홍길동', '9999').length, 1);
  assert.equal(s.findRosterMatches(roster, '홍길동', '0000').length, 0);
  assert.equal(s.findRosterMatches(roster, '김영희', '567').length, 0);
  assert.equal(s.findRosterMatches(roster, '', '5678').length, 0);
});

test('pickChallengeLink prefers cohort match, falls back to 전체, skips inactive/empty', () => {
  const links = [
    { cohort: '3기', link: 'https://a', active: true },
    { cohort: '4기', link: 'https://b', active: false },
    { cohort: '전체', link: 'https://default', active: true },
  ];
  assert.equal(s.pickChallengeLink(links, '3기'), 'https://a');
  assert.equal(s.pickChallengeLink(links, '4기'), 'https://default');
  assert.equal(s.pickChallengeLink(links, ''), 'https://default');
  assert.equal(s.pickChallengeLink([{ cohort: '전체', link: '', active: true }], '3기'), null);
  assert.equal(s.pickChallengeLink([], '3기'), null);
});

test('maskPhone hides the middle', () => {
  assert.equal(s.maskPhone('010-1234-5678'), '010-****-5678');
  assert.equal(s.maskPhone('5678'), '****-5678');
});

test('validateSurvey flags missing required fields, allows empty nickname', () => {
  const r = s.validateSurvey({ cohort: '3기', ageGroup: '29', gender: '여성', region: '서울', major: '디자인', promoLink: 'https://x', educationHelp: 'a', currentConcern: 'b', effortAndLimit: 'c', communityExpectation: 'd', futureCommitment: 'e' });
  assert.equal(r.ok, true);
  assert.equal(r.values.nickname, '');
  const bad = s.validateSurvey({ cohort: '3기' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.ageGroup);
  assert.ok(!bad.errors.nickname);
});

test('buildSurveyRow follows SURVEY_COLUMNS order', () => {
  const values = s.validateSurvey({ nickname: 'nick', cohort: '3기', ageGroup: '29', gender: '여성', region: '서울', major: '디자인', promoLink: 'https://x', educationHelp: 'a', currentConcern: 'b', effortAndLimit: 'c', communityExpectation: 'd', futureCommitment: 'e' }).values;
  const row = s.buildSurveyRow({ rosterEntry: { name: '홍길동', phone: '010-1234-5678' }, values, cohort: '3기', kakaoLink: 'https://k', now: new Date('2026-09-02T00:00:00Z') });
  assert.equal(row.length, s.SURVEY_COLUMNS.length);
  assert.equal(row[0], '2026-09-02 09:00:00');
  assert.equal(row[1], '3기');
  assert.equal(row[2], '홍길동');
  assert.equal(row[3], 'nick');
  assert.equal(row[4], '010-1234-5678');
  assert.equal(row[row.length - 1], 'https://k');
});

test('findExistingSubmission compares digits only', () => {
  const rows = [{ phone: '01012345678', kakaoLink: 'x' }];
  assert.ok(s.findExistingSubmission(rows, '010-1234-5678'));
  assert.equal(s.findExistingSubmission(rows, '010-1234-0000'), null);
});
