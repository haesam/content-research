const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../lib/diagnosis');

test('TARGETS: each target has exactly the axes covered with 2 questions each (12 total)', () => {
  d.TARGET_KEYS.forEach((key) => {
    const qs = d.allQuestions(key);
    assert.equal(qs.length, 12, `${key} should have 12 questions`);
    d.AXES.forEach((axis) => {
      const forAxis = qs.filter((q) => q.axisId === axis.id);
      assert.equal(forAxis.length, 2, `${key}/${axis.id} should have 2 questions`);
    });
    assert.ok(d.TARGETS[key].axisHooks, `${key} needs axisHooks`);
    d.AXES.forEach((axis) => assert.ok(d.TARGETS[key].axisHooks[axis.id], `${key}/${axis.id} hook missing`));
  });
});

test('computeReport: all "yes" answers score 100 and grade A', () => {
  const answers = {};
  d.allQuestions('church').forEach((q) => { answers[q.key] = 'yes'; });
  const report = d.computeReport('church', answers);
  assert.equal(report.totalScore, 100);
  assert.equal(report.grade, 'A');
  d.AXES.forEach((axis) => assert.equal(report.axisScores[axis.id], 100));
});

test('computeReport: all "unknown" answers score 0 and grade F', () => {
  const answers = {};
  d.allQuestions('smb').forEach((q) => { answers[q.key] = 'unknown'; });
  const report = d.computeReport('smb', answers);
  assert.equal(report.totalScore, 0);
  assert.equal(report.grade, 'F');
});

test('computeReport: mostly "no" with a couple "모름" lands on the documented example (42점/D등급)', () => {
  // 4개 축은 두 문항 모두 '아니오'(축당 50점), 2개 축은 '아니오'+'모름'(축당 25점)
  // => (50*4 + 25*2) / 6 = 41.67 -> 반올림 42점, D등급 (기능상세서 6-1 예시와 일치)
  const answers = {};
  d.allQuestions('church').forEach((q) => { answers[q.key] = 'no'; });
  answers['cta:1'] = 'unknown';
  answers['seo:1'] = 'unknown';
  const report = d.computeReport('church', answers);
  assert.equal(report.totalScore, 42);
  assert.equal(report.grade, 'D');
});

test('computeReport: weakestAxis points at the lowest-scoring axis', () => {
  const answers = {};
  d.allQuestions('professional').forEach((q) => { answers[q.key] = 'yes'; });
  answers['seo:0'] = 'no';
  answers['seo:1'] = 'unknown';
  const report = d.computeReport('professional', answers);
  assert.equal(report.weakestAxis, 'seo');
});

test('validateAnswers: rejects unknown target, missing keys, and bad values', () => {
  assert.equal(d.validateAnswers('nope', {}).ok, false);
  assert.equal(d.validateAnswers('church', {}).ok, false);

  const full = {};
  d.allQuestions('church').forEach((q) => { full[q.key] = 'yes'; });
  assert.equal(d.validateAnswers('church', full).ok, true);

  const bad = Object.assign({}, full, { 'mobile:0': 'maybe' });
  assert.equal(d.validateAnswers('church', bad).ok, false);
});

test('validateLead: requires name/phone, formats phone, allows blank org/interest', () => {
  const bad = d.validateLead({ name: '', phone: '123' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.phone);

  const good = d.validateLead({ name: '홍길동', phone: '01012345678', org: '', interest: '' });
  assert.equal(good.ok, true);
  assert.equal(good.values.phone, '010-1234-5678');
  assert.equal(good.values.org, '');
});

test('buildDiagnosisRow: follows DIAGNOSIS_COLUMNS order', () => {
  const answers = {};
  d.allQuestions('nonprofit').forEach((q) => { answers[q.key] = 'yes'; });
  const report = d.computeReport('nonprofit', answers);
  const lead = d.validateLead({ name: '김단체', phone: '010-1111-2222', org: '좋은단체', interest: '견적 문의' }).values;
  const row = d.buildDiagnosisRow({ target: 'nonprofit', report, lead, now: new Date('2026-09-15T00:00:00Z') });
  assert.equal(row.length, d.DIAGNOSIS_COLUMNS.length);
  assert.equal(row[0], '2026-09-15 09:00:00');
  assert.equal(row[1], d.TARGETS.nonprofit.label);
  assert.equal(row[2], '100');
  assert.equal(row[3], 'A');
  assert.equal(row[11], '김단체');
  assert.equal(row[12], '010-1111-2222');
  assert.equal(row[13], '좋은단체');
  assert.equal(row[14], '견적 문의');
});
