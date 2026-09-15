const test = require('node:test');
const assert = require('node:assert/strict');
const { createFakeSheets, installFakeSheets } = require('../scripts/fake-sheets');
const rate = require('../lib/ratelimit');
const d = require('../lib/diagnosis');

let fake;
function freshHandlers(seed) {
  fake = installFakeSheets(createFakeSheets(seed));
  for (const m of ['../api/diagnosis/submit', '../api/diagnosis/setup', '../api/diagnosis/health', '../api/diagnosis/config']) {
    delete require.cache[require.resolve(m)];
  }
  return {
    submit: require('../api/diagnosis/submit'),
    setup: require('../api/diagnosis/setup'),
    health: require('../api/diagnosis/health'),
    config: require('../api/diagnosis/config'),
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

function allYesAnswers(target) {
  const answers = {};
  d.allQuestions(target).forEach((q) => { answers[q.key] = 'yes'; });
  return answers;
}

test.beforeEach(() => {
  rate.reset();
  process.env.GOOGLE_DIAGNOSIS_SHEET_ID = 'test-diagnosis-sheet';
});

test('config: returns axes/targets/gradeBands', async () => {
  const h = freshHandlers();
  const res = mockRes();
  await h.config(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.axes.length, 6);
  assert.equal(Object.keys(res.body.targets).length, 4);
});

test('submit: rejects non-POST, unknown target, and incomplete answers', async () => {
  const h = freshHandlers();

  let res = mockRes();
  await h.submit(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);

  res = mockRes();
  await h.submit(mockReq({ body: { target: 'nope', answers: {}, lead: {} } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'INVALID_TARGET');

  res = mockRes();
  await h.submit(mockReq({ body: { target: 'church', answers: { 'mobile:0': 'yes' }, lead: {} } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'INVALID_ANSWERS');
});

test('submit: valid answers but missing lead fields -> VALIDATION', async () => {
  const h = freshHandlers();
  const res = mockRes();
  await h.submit(mockReq({ body: { target: 'church', answers: allYesAnswers('church'), lead: { name: '', phone: '' } } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'VALIDATION');
  assert.ok(res.body.fields.name);
  assert.ok(res.body.fields.phone);
});

test('submit: saves a row and returns the server-computed report (ignores client score if any)', async () => {
  const h = freshHandlers();
  const res = mockRes();
  await h.submit(mockReq({ body: {
    target: 'professional',
    answers: allYesAnswers('professional'),
    lead: { name: '김노무사', phone: '01055556666', org: '김노무사사무소', interest: '견적 문의' },
  } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.report.totalScore, 100);
  assert.equal(res.body.report.grade, 'A');
  assert.equal(fake.state.diagnosisLeads.length, 1);
  const row = fake.state.diagnosisLeads[0];
  assert.equal(row[1], d.TARGETS.professional.label);
  assert.equal(row[11], '김노무사');
  assert.equal(row[12], '010-5555-6666');
});

test('submit: auto-initializes the sheet when the tab is missing', async () => {
  const h = freshHandlers();
  const real = fake.appendDiagnosisLead;
  let attempt = 0;
  fake.appendDiagnosisLead = async (row) => {
    attempt++;
    if (attempt === 1) throw new Error("Unable to parse range: '홈페이지진단리드'!A1");
    return real(row);
  };
  const res = mockRes();
  await h.submit(mockReq({ body: { target: 'smb', answers: allYesAnswers('smb'), lead: { name: '박사장', phone: '010-9999-0000' } } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fake.state.setupCalls, ['diagnosis']);
  assert.equal(fake.state.diagnosisLeads.length, 1);
});

test('submit: rate limited after 8 attempts from one ip', async () => {
  const h = freshHandlers();
  const headers = { 'x-forwarded-for': '198.51.100.42' };
  let last;
  for (let i = 0; i < 9; i++) {
    last = mockRes();
    await h.submit(mockReq({ body: { target: 'church', answers: {}, lead: {} }, headers }), last);
  }
  assert.equal(last.statusCode, 429);
  assert.equal(last.body.error, 'RATE_LIMITED');
});

test('setup/health: guarded by SETUP_SECRET', async () => {
  const h = freshHandlers();
  delete process.env.SETUP_SECRET;
  let res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/diagnosis/setup?key=x' }), res);
  assert.equal(res.statusCode, 500);

  process.env.SETUP_SECRET = 'abc';
  res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/diagnosis/setup?key=wrong' }), res);
  assert.equal(res.statusCode, 401);

  res = mockRes();
  await h.setup(mockReq({ method: 'GET', url: '/api/diagnosis/setup?key=abc' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fake.state.setupCalls, ['diagnosis']);

  res = mockRes();
  await h.health(mockReq({ method: 'GET', url: '/api/diagnosis/health?key=abc' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);

  delete process.env.SETUP_SECRET;
});
