const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../lib/survey');

const full = {
  name: '홍 길동', nickname: '', cohort: ' 3기 ', phone: '01012345678', ageGroup: '29', gender: '여성',
  region: '서울', major: '디자인', promoLink: 'https://x', educationHelp: 'a', currentConcern: 'b',
  effortAndLimit: 'c', communityExpectation: 'd', futureCommitment: 'e',
};

test('isValidPhone / formatPhone', () => {
  assert.equal(s.isValidPhone('010-1234-5678'), true);
  assert.equal(s.isValidPhone('01012345678'), true);
  assert.equal(s.isValidPhone('0212345678'), true);
  assert.equal(s.isValidPhone('1234'), false);
  assert.equal(s.isValidPhone('1101234567'), false);
  assert.equal(s.formatPhone('01012345678'), '010-1234-5678');
  assert.equal(s.formatPhone('0212345678'), '021-234-5678');
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

test('validateSurvey: cleans values, formats phone, flags missing/invalid', () => {
  const r = s.validateSurvey(full);
  assert.equal(r.ok, true);
  assert.equal(r.values.name, '홍 길동');
  assert.equal(r.values.phone, '010-1234-5678');
  assert.equal(r.values.cohort, '3기');
  assert.equal(r.values.nickname, '');

  const bad = s.validateSurvey({ name: '홍길동', phone: '1234' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.cohort);
  assert.ok(bad.errors.ageGroup);
  assert.ok(!bad.errors.name);
  assert.ok(!bad.errors.nickname);
});

test('buildSurveyRow follows SURVEY_COLUMNS order', () => {
  const values = s.validateSurvey(Object.assign({}, full, { nickname: 'nick' })).values;
  const row = s.buildSurveyRow({ values, kakaoLink: 'https://k', now: new Date('2026-09-02T00:00:00Z') });
  assert.equal(row.length, s.SURVEY_COLUMNS.length);
  assert.equal(row[0], '2026-09-02 09:00:00');
  assert.equal(row[1], '3기');
  assert.equal(row[2], '홍 길동');
  assert.equal(row[3], 'nick');
  assert.equal(row[4], '010-1234-5678');
  assert.equal(row[row.length - 1], 'https://k');
});

test('findExistingSubmission compares digits only', () => {
  const rows = [{ phone: '01012345678', kakaoLink: 'x' }];
  assert.ok(s.findExistingSubmission(rows, '010-1234-5678'));
  assert.equal(s.findExistingSubmission(rows, '010-1234-0000'), null);
});
