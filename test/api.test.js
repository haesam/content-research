const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeSheets, installFakeSheets } = require('../scripts/fake-sheets');
const rate = require('../lib/ratelimit');

let fake;
function freshHandlers(seed) {
  fake = installFakeSheets(createFakeSheets(seed));
  for (const m of ['../api/survey/submit', '../api/survey/setup']) {
    delete require.cache[require.resolve(m)];
  }
  return {
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
  name: '홍길동', nickname: '', cohort: '3기', phone: '010-1234-5678',
  ageGroup: '29', gender: '여성', region: '서울', major: '디자인',
  promoLink: 'https://me.example', educationHelp: 'a', currentConcern: 'b',
  effortAndLimit: 'c', communityExpectation: 'd', futureCommitment: 'e',
};

const EXPECTED_ROOMS = [
  { name: '콘텐츠 챌린지 단톡방', link: 'https://open.kakao.com/o/guCDOQLi', password: '2631' },
  { name: '제작 챌린지 단톡방', link: 'https://open.kakao.com/o/gpPEPQLi', password: '2631' },
  { name: '영업 챌린지 단톡방', link: 'https://open.kakao.com/o/gV49PQLi', password: '2631' },
];

test.beforeEach(() => rate.reset());

test('submit: rejects non-POST and validation errors', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.submit(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);

  res = mockRes();
  await h.submit(mockReq({ body: { name: '홍길동', phone: '1234', ageGroup: '29' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'VALIDATION');
  assert.ok(res.body.fields.phone);
  assert.ok(res.body.fields.gender);
  assert.equal(fake.state.submissions.length, 0);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('submit: appends row and returns the three rooms with password', async () => {
  const h = freshHandlers();
  const res = mockRes();
  await h.submit(mockReq({ body: { ...fullSurvey, phone: '01012345678' } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, alreadySubmitted: false, rooms: EXPECTED_ROOMS });
  assert.equal(fake.state.submissions.length, 1);
  const row = fake.state.submissions[0];
  assert.equal(row[1], '3기');
  assert.equal(row[2], '홍길동');
  assert.equal(row[4], '010-1234-5678', 'phone stored in normalized form');
  assert.equal(row[row.length - 1], '콘텐츠 챌린지 단톡방, 제작 챌린지 단톡방, 영업 챌린지 단톡방');
});

test('submit: duplicate phone returns rooms without appending', async () => {
  const h = freshHandlers();
  let res = mockRes();
  await h.submit(mockReq({ body: fullSurvey }), res);
  res = mockRes();
  await h.submit(mockReq({ body: { ...fullSurvey, name: '홍길동2', phone: '010 1234 5678' } }), res);
  assert.equal(res.body.alreadySubmitted, true);
  assert.deepEqual(res.body.rooms, EXPECTED_ROOMS);
  assert.equal(fake.state.submissions.length, 1);
});

test('submit: empty sheet tab → built-in default rooms; all inactive → no rooms', async () => {
  let h = freshHandlers({ rooms: [] });
  let res = mockRes();
  await h.submit(mockReq({ body: fullSurvey }), res);
  assert.deepEqual(res.body.rooms, EXPECTED_ROOMS);

  h = freshHandlers({ rooms: [{ name: '콘텐츠', link: 'https://a', password: '1', active: false }] });
  res = mockRes();
  await h.submit(mockReq({ body: fullSurvey }), res);
  assert.deepEqual(res.body.rooms, []);
  assert.equal(fake.state.submissions[0][fake.state.submissions[0].length - 1], '');
});

test('submit: sheet read failure for rooms falls back to defaults, submission still saved', async () => {
  const h = freshHandlers();
  fake.readChallengeRooms = async () => { throw new Error('boom'); };
  const res = mockRes();
  await h.submit(mockReq({ body: fullSurvey }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.rooms, EXPECTED_ROOMS);
  assert.equal(fake.state.submissions.length, 1);
});

test('submit: rate limited after 8 attempts from one ip', async () => {
  const h = freshHandlers();
  const headers = { 'x-forwarded-for': '198.51.100.7' };
  let last;
  for (let i = 0; i < 9; i++) {
    last = mockRes();
    await h.submit(mockReq({ body: { name: 'x' }, headers }), last);
  }
  assert.equal(last.statusCode, 429);
  assert.equal(last.body.error, 'RATE_LIMITED');
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
  assert.deepEqual(fake.state.setupCalls, ['survey']);
  delete process.env.SETUP_SECRET;
});
