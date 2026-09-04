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

test('activeRooms keeps active rooms with links, trims, defaults name', () => {
  const rooms = s.activeRooms([
    { name: ' 콘텐츠 ', link: ' https://a ', password: ' 2631 ', active: true },
    { name: '제작', link: 'https://b', password: '2631', active: false },
    { name: '영업', link: '', password: '2631', active: true },
    { name: '', link: 'https://d', password: '', active: true },
  ]);
  assert.deepEqual(rooms, [
    { name: '콘텐츠', link: 'https://a', password: '2631' },
    { name: '챌린지 단톡방', link: 'https://d', password: '' },
  ]);
  assert.equal(s.activeRooms(s.DEFAULT_ROOMS).length, 3);
  assert.ok(s.DEFAULT_ROOMS.every((r) => r.password === '2631'));
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

test('buildSurveyRow follows SURVEY_COLUMNS order and lists room names', () => {
  const values = s.validateSurvey(Object.assign({}, full, { nickname: 'nick' })).values;
  const rooms = s.activeRooms(s.DEFAULT_ROOMS);
  const row = s.buildSurveyRow({ values, rooms, now: new Date('2026-09-02T00:00:00Z') });
  assert.equal(row.length, s.SURVEY_COLUMNS.length);
  assert.equal(row[0], '2026-09-02 09:00:00');
  assert.equal(row[1], '3기');
  assert.equal(row[2], '홍 길동');
  assert.equal(row[3], 'nick');
  assert.equal(row[4], '010-1234-5678');
  assert.equal(row[row.length - 1], '콘텐츠 챌린지 단톡방, 제작 챌린지 단톡방, 영업 챌린지 단톡방');
});

test('findExistingSubmission compares digits only', () => {
  const rows = [{ phone: '01012345678' }];
  assert.ok(s.findExistingSubmission(rows, '010-1234-5678'));
  assert.equal(s.findExistingSubmission(rows, '010-1234-0000'), null);
});
