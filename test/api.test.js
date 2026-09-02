const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeSheets, installFakeSheets } = require('../scripts/fake-sheets');
const rate = require('../lib/ratelimit');

let fake;
function freshHandlers() {
  fake = installFakeSheets(createFakeSheets());
  for (const m of ['../lib/citizen', '../api/survey/verify', '../api/survey/submit', '../api/survey/setup']) {
    delete require.cache[require.resolve(m)];
  }
  return {
    verify: require('../api/survey/verify'),
    submit: require('../api/survey/submit'),
    setup: require('../api/survey/setup'),
  };
}

function mockReq({ method = 'POST', body = {}, headers = {}, url = '/' } = {}) {
  return { method, body, headers: Object.assign({ 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 250) }, headers), url, socket: { remoteAddress: '127.0.0.1' } };
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.body = o; return res; };
  return res;
}

const fullSurvey = {
  nickname: '', ageGroup: '29', gender: '여성', region: '서울', major: '디자인',
  promoLink: 'https://me.example', educationHelp: 'a', currentConcern: 'b',
  effortAndLimit: 'c', communityExpectation: 'd', futureCommitment: 'e',
};

test.beforeEach(() => rate.reset());

test('verify: rejects non-POST and bad input', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.verify(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  res = mockRes();
  await h.verify(mockReq({ body: { name: '홍길동', phoneLast4: '12' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'INVALID_INPUT');
});

test('verify: NOT_FOUND / AMBIGUOUS / OK without leaking phone', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.verify(mockReq({ body: { name: '홍길동', phoneLast4: '0000' } }), res);
  assert.deepEqual(res.body, { ok: false, error: 'NOT_FOUND' });

  res = mockRes();
  await h.verify(mockReq({ body: { name: '박철수', phoneLast4: '2222' } }), res);
  assert.deepEqual(res.body, { ok: false, error: 'AMBIGUOUS' });

  res = mockRes();
  await h.verify(mockReq({ body: { name: ' 홍 길동', phoneLast4: '5678' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.cohort, '3기');
  assert.equal(res.body.cohortLocked, true);
  assert.equal(res.body.phoneMasked, '010-****-5678');
  assert.equal(res.body.alreadySubmitted, false);
  assert.ok(!JSON.stringify(res.body).includes('1234'), 'full phone must not leak');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('verify: rate limited after 10 attempts from one ip', async () => {
  const h = freshHandlers();
  const headers = { 'x-forwarded-for': '198.51.100.7' };
  let last;
  for (let i = 0; i < 11; i++) {
    last = mockRes();
    await h.verify(mockReq({ body: { name: '없음', phoneLast4: '0000' }, headers }), last);
  }
  assert.equal(last.statusCode, 429);
  assert.equal(last.body.error, 'RATE_LIMITED');
});

test('submit: forbids unknown citizen, validates fields, appends row, returns link', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.submit(mockReq({ body: { name: '아무개', phoneLast4: '0000', ...fullSurvey } }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'NOT_FOUND');

  res = mockRes();
  await h.submit(mockReq({ body: { name: '홍길동', phoneLast4: '5678', ageGroup: '29' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'VALIDATION');
  assert.ok(res.body.fields.gender);
  assert.ok(!res.body.fields.cohort, 'cohort comes from roster when present');

  res = mockRes();
  await h.submit(mockReq({ body: { name: '홍길동', phoneLast4: '5678', cohort: '틀린기수', ...fullSurvey } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, alreadySubmitted: false, kakaoLink: 'https://open.kakao.com/o/fake-3gi' });
  assert.equal(fake.state.submissions.length, 1);
  const row = fake.state.submissions[0];
  assert.equal(row[1], '3기', 'roster cohort overrides client cohort');
  assert.equal(row[2], '홍길동');
  assert.equal(row[4], '010-1234-5678');
  assert.equal(row[row.length - 1], 'https://open.kakao.com/o/fake-3gi');
});

test('submit: duplicate submission returns existing link without appending', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.submit(mockReq({ body: { name: '홍길동', phoneLast4: '5678', ...fullSurvey } }), res);
  res = mockRes();
  await h.submit(mockReq({ body: { name: '홍길동', phoneLast4: '5678', ...fullSurvey } }), res);
  assert.equal(res.body.alreadySubmitted, true);
  assert.equal(res.body.kakaoLink, 'https://open.kakao.com/o/fake-3gi');
  assert.equal(fake.state.submissions.length, 1);

  // verify afterwards also short-circuits to the link
  res = mockRes();
  await h.verify(mockReq({ body: { name: '홍길동', phoneLast4: '5678' } }), res);
  assert.equal(res.body.alreadySubmitted, true);
  assert.equal(res.body.kakaoLink, 'https://open.kakao.com/o/fake-3gi');
});

test('submit: citizen without cohort in roster uses typed cohort; missing link → null', async () => {
  const h = freshHandlers();
  const res = mockRes();
  await h.submit(mockReq({ body: { name: '김영희', phoneLast4: '1111', cohort: '5기', ...fullSurvey } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.kakaoLink, null);
  assert.equal(fake.state.submissions[0][1], '5기');
});

test('setup: requires SETUP_SECRET and matching key', async () => {
  const h = freshHandlers();
  delete process.env.SETUP_SECRET;
  let res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/survey/setup?key=x' }), res);
  assert.equal(res.statusCode, 500);

  process.env.SETUP_SECRET = 'abc';
  res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/survey/setup?key=wrong' }), res);
  assert.equal(res.statusCode, 401);

  res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/survey/setup?key=abc' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fake.state.setupCalls, ['roster', 'survey']);
  delete process.env.SETUP_SECRET;
});
