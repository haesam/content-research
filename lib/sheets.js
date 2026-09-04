const { google } = require('googleapis');
const { SURVEY_COLUMNS, DEFAULT_ROOMS } = require('./survey');

// ---------------------------------------------------------------------------
// 시트 위치/양식 정의
// ---------------------------------------------------------------------------

// 시트 ID는 비밀이 아니다(접근은 공유 설정으로 통제). 환경변수로 바꿔 끼울 수 있다.
const SURVEY_SHEET_ID = process.env.GOOGLE_SURVEY_SHEET_ID || '12oqxXE3giBnlTjxLdhOePiyK4Ml47dkQK_39VGGgffE';

const TABS = {
  survey: '설문응답',     // 제출된 설문
  links: '챌린지링크',    // 제출 후 안내할 단톡방 목록
};

const SURVEY_HEADERS = SURVEY_COLUMNS.map((c) => c.header);
const LINKS_HEADERS = ['단톡방 이름', '카카오톡 단톡 링크', '입장 암호', '활성(TRUE/FALSE)', '메모'];
const LINKS_SEED_ROWS = DEFAULT_ROOMS.map((r) => [r.name, r.link, r.password, 'TRUE', '']);

// ---------------------------------------------------------------------------
// 인증
// ---------------------------------------------------------------------------

function getAuthClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 없습니다.');
  }
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuthClient();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// 한글 탭 이름도 안전하게 A1 표기로 감싼다
function q(tab, range) {
  return `'${String(tab).replace(/'/g, "''")}'!${range}`;
}

function colLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseActive(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  if (v === '') return true; // 비워두면 활성으로 간주
  return !['false', 'n', 'no', '0', '아니오', '비활성', 'x'].includes(v);
}

// ---------------------------------------------------------------------------
// 기존 유튜브 파이프라인용 (그대로 유지)
// ---------------------------------------------------------------------------

async function readConfigKeywords() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'config!A2:D100',
  });

  const rows = res.data.values || [];
  return rows
    .filter((row) => row.length >= 4)
    .map((row) => ({
      keyword: row[0],
      keyword_en: row[1],
      group: row[2],
      active: String(row[3]).toUpperCase() === 'TRUE',
    }));
}

async function appendContentRows(rows) {
  if (!rows.length) return;
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'contents!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

// ---------------------------------------------------------------------------
// 설문 / 챌린지 링크
// ---------------------------------------------------------------------------

// 챌린지링크 탭 → [{ name, link, password, active }]  (행이 하나도 없으면 빈 배열)
async function readChallengeRooms() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SURVEY_SHEET_ID,
    range: q(TABS.links, 'A2:D'),
  });
  const rows = res.data.values || [];
  return rows
    .map((row) => ({
      name: String(row[0] || '').trim(),
      link: String(row[1] || '').trim(),
      password: String(row[2] || '').trim(),
      active: parseActive(row[3]),
    }))
    .filter((r) => r.name || r.link);
}

// 설문응답 탭 → 중복 제출 확인에 필요한 최소 정보만 [{ cohort, name, phone }]
async function readSurveySubmissions() {
  const sheets = await getSheetsClient();
  const lastCol = colLetter(SURVEY_COLUMNS.length - 1);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SURVEY_SHEET_ID,
    range: q(TABS.survey, `A2:${lastCol}`),
  });
  const rows = res.data.values || [];
  const idx = (key) => SURVEY_COLUMNS.findIndex((c) => c.key === key);
  const iCohort = idx('cohort'), iName = idx('name'), iPhone = idx('phone');
  return rows
    .map((row) => ({
      cohort: String(row[iCohort] || '').trim(),
      name: String(row[iName] || '').trim(),
      phone: String(row[iPhone] || '').trim(),
    }))
    .filter((r) => r.phone);
}

async function appendSurveyResponse(row) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SURVEY_SHEET_ID,
    range: q(TABS.survey, 'A1'),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// ---------------------------------------------------------------------------
// 최초 1회 시트 양식 만들기 (탭 생성 + 헤더 + 첫 행 고정)
// ---------------------------------------------------------------------------

const DEFAULT_TAB_NAMES = ['Sheet1', '시트1'];

async function setupSpreadsheet(spreadsheetId, tabSpecs) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const existing = (meta.data.sheets || []).map((s) => s.properties);
  const summary = { spreadsheetId, renamed: [], created: [], headersWritten: [], untouched: [] };

  const titles = new Set(existing.map((p) => p.title));
  const usedSpares = new Set();
  const requests = [];

  for (const spec of tabSpecs) {
    if (titles.has(spec.title)) continue;
    // 비어 있는 기본 탭(Sheet1/시트1)이 남아 있으면 새로 만들지 않고 이름만 바꾼다
    const spare = existing.find((p) => DEFAULT_TAB_NAMES.includes(p.title) && !usedSpares.has(p.sheetId));
    if (spare) {
      const probe = await sheets.spreadsheets.values.get({ spreadsheetId, range: q(spare.title, 'A1:C3') });
      if (!(probe.data.values || []).length) {
        requests.push({ updateSheetProperties: { properties: { sheetId: spare.sheetId, title: spec.title }, fields: 'title' } });
        usedSpares.add(spare.sheetId);
        summary.renamed.push(`${spare.title} → ${spec.title}`);
        continue;
      }
    }
    requests.push({ addSheet: { properties: { title: spec.title } } });
    summary.created.push(spec.title);
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  // 헤더가 비어 있으면 채우고, 첫 행을 고정한다
  const meta2 = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const props = new Map((meta2.data.sheets || []).map((s) => [s.properties.title, s.properties]));
  const formatRequests = [];

  for (const spec of tabSpecs) {
    const head = await sheets.spreadsheets.values.get({ spreadsheetId, range: q(spec.title, '1:1') });
    const hasHeader = ((head.data.values || [])[0] || []).some((v) => String(v).trim());
    if (hasHeader) {
      summary.untouched.push(spec.title);
      continue;
    }
    const values = [spec.headers, ...(spec.seedRows || [])];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: q(spec.title, 'A1'),
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    summary.headersWritten.push(spec.title);

    const p = props.get(spec.title);
    if (p) {
      formatRequests.push({
        updateSheetProperties: {
          properties: { sheetId: p.sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      });
      formatRequests.push({
        repeatCell: {
          range: { sheetId: p.sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      });
    }
  }

  if (formatRequests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: formatRequests } });
  }
  return summary;
}

async function setupSurveySheet() {
  return setupSpreadsheet(SURVEY_SHEET_ID, [
    { title: TABS.survey, headers: SURVEY_HEADERS },
    { title: TABS.links, headers: LINKS_HEADERS, seedRows: LINKS_SEED_ROWS },
  ]);
}

// ---------------------------------------------------------------------------
// 진단: 환경변수 → 시트 접근 → 탭 존재 순으로 점검하고, 막힌 곳의 해결 방법을 알려준다
// ---------------------------------------------------------------------------

async function checkSurveySheet() {
  const report = { ok: true, spreadsheetId: SURVEY_SHEET_ID, checks: [], fix: [] };
  const add = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) report.ok = false; };

  // 1) 환경변수
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let clientEmail = '';
  if (!raw) {
    add('GOOGLE_SERVICE_ACCOUNT_KEY', false, '환경변수가 없습니다');
    report.fix.push('Vercel 프로젝트 설정 → Environment Variables에 GOOGLE_SERVICE_ACCOUNT_KEY(서비스 계정 JSON 전체)를 넣고 Redeploy 하세요.');
    return report;
  }
  try {
    clientEmail = JSON.parse(raw).client_email || '';
    add('GOOGLE_SERVICE_ACCOUNT_KEY', true, `서비스 계정: ${clientEmail || '(client_email 없음)'}`);
  } catch (_) {
    add('GOOGLE_SERVICE_ACCOUNT_KEY', false, 'JSON 형식이 아닙니다');
    report.fix.push('환경변수 값이 서비스 계정 JSON 전체(중괄호 포함)인지 확인하세요.');
    return report;
  }

  // 2) 시트 접근
  let sheetsApi, meta;
  try {
    sheetsApi = await getSheetsClient();
    meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SURVEY_SHEET_ID, fields: 'properties.title,sheets.properties' });
    add('시트 접근', true, `"${meta.data.properties.title}" 열림`);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    add('시트 접근', false, msg);
    if (/permission|forbidden|403/i.test(msg)) {
      report.fix.push(`구글시트 공유에서 ${clientEmail || '서비스 계정 이메일'} 을(를) "편집자"로 추가하세요.`);
    } else if (/not found|404/i.test(msg)) {
      report.fix.push('시트 ID가 맞는지(GOOGLE_SURVEY_SHEET_ID 또는 코드 기본값) 확인하세요.');
    } else {
      report.fix.push('서비스 계정 키가 유효한지, Google Sheets API가 사용 설정되어 있는지 확인하세요.');
    }
    return report;
  }

  // 3) 탭 존재
  const titles = new Set((meta.data.sheets || []).map((s) => s.properties.title));
  const missing = [TABS.survey, TABS.links].filter((t) => !titles.has(t));
  if (missing.length) {
    add('탭', false, `없는 탭: ${missing.join(', ')}`);
    report.fix.push('/api/survey/setup?key=<SETUP_SECRET> 를 한 번 열어 탭과 헤더를 만드세요. (첫 제출 때 자동으로도 생성됩니다)');
  } else {
    add('탭', true, `${TABS.survey}, ${TABS.links} 있음`);
  }

  // 4) 쓰기 권한 (헤더 행을 그대로 다시 써서 확인 — 내용은 바뀌지 않음)
  if (!missing.includes(TABS.survey)) {
    try {
      const head = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SURVEY_SHEET_ID, range: q(TABS.survey, '1:1') });
      const headerRow = (head.data.values || [])[0] || SURVEY_HEADERS;
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId: SURVEY_SHEET_ID, range: q(TABS.survey, 'A1'), valueInputOption: 'RAW', requestBody: { values: [headerRow] },
      });
      add('쓰기 권한', true, '편집자 권한 확인됨');
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      add('쓰기 권한', false, msg);
      report.fix.push(`서비스 계정(${clientEmail})의 권한을 "뷰어"가 아니라 "편집자"로 바꾸세요.`);
    }
    try {
      const rows = await readSurveySubmissions();
      add('설문응답 행 수', true, `${rows.length}건`);
    } catch (_) { /* 위에서 이미 보고됨 */ }
  }
  if (!missing.includes(TABS.links)) {
    try {
      const rooms = await readChallengeRooms();
      add('챌린지링크', true, `${rooms.length}개 방 (활성 ${rooms.filter((r) => r.active && r.link).length}개)`);
    } catch (err) {
      add('챌린지링크', false, err.message);
    }
  }
  return report;
}

module.exports = {
  // 기존
  readConfigKeywords,
  appendContentRows,
  // 설문 / 챌린지 링크
  readChallengeRooms,
  readSurveySubmissions,
  appendSurveyResponse,
  setupSurveySheet,
  checkSurveySheet,
  // 상수 (문서/테스트용)
  SURVEY_SHEET_ID,
  TABS,
  SURVEY_HEADERS,
  LINKS_HEADERS,
  LINKS_SEED_ROWS,
};
