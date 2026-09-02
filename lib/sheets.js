const { google } = require('googleapis');
const { SURVEY_COLUMNS } = require('./survey');

// ---------------------------------------------------------------------------
// 시트 위치/양식 정의
// ---------------------------------------------------------------------------

// 시트 ID는 비밀이 아니다(접근은 공유 설정으로 통제). 환경변수로 바꿔 끼울 수 있다.
const ROSTER_SHEET_ID = process.env.GOOGLE_ROSTER_SHEET_ID || '13yXgwE4lsxQ-t1hXzz-9hHIkifN_ANaHAkcpeNOz50o';
const SURVEY_SHEET_ID = process.env.GOOGLE_SURVEY_SHEET_ID || '12oqxXE3giBnlTjxLdhOePiyK4Ml47dkQK_39VGGgffE';

const TABS = {
  roster: '수강생명단',   // 시민 확인용 명단 (관리자 전용 시트)
  links: '챌린지링크',    // 기수별 단톡 링크 (관리자 전용 시트)
  survey: '설문응답',     // 제출된 설문 (설문 결과 시트)
};

const ROSTER_HEADERS = ['이름', '연락처', '기수', '비고'];
const LINKS_HEADERS = ['기수', '카카오톡 단톡 링크', '활성(TRUE/FALSE)', '메모'];
const SURVEY_HEADERS = SURVEY_COLUMNS.map((c) => c.header);

const LINKS_SEED_ROWS = [
  ['전체', '', 'TRUE', '기수별 링크가 없을 때 쓰는 기본 링크. 단톡 링크를 B열에 붙여넣으세요.'],
];

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
// 시민 확인 / 설문
// ---------------------------------------------------------------------------

// 수강생명단 탭 → [{ name, phone, cohort }]
async function readRoster() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ROSTER_SHEET_ID,
    range: q(TABS.roster, 'A2:C'),
  });
  const rows = res.data.values || [];
  return rows
    .map((row) => ({
      name: String(row[0] || '').trim(),
      phone: String(row[1] || '').trim(),
      cohort: String(row[2] || '').trim(),
    }))
    .filter((r) => r.name && r.phone);
}

// 챌린지링크 탭 → [{ cohort, link, active }]
async function readChallengeLinks() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ROSTER_SHEET_ID,
    range: q(TABS.links, 'A2:C'),
  });
  const rows = res.data.values || [];
  return rows
    .map((row) => ({
      cohort: String(row[0] || '').trim(),
      link: String(row[1] || '').trim(),
      active: parseActive(row[2]),
    }))
    .filter((r) => r.cohort);
}

// 설문응답 탭 → 중복 제출 확인에 필요한 최소 정보만 [{ cohort, name, phone, kakaoLink }]
async function readSurveySubmissions() {
  const sheets = await getSheetsClient();
  const lastCol = colLetter(SURVEY_COLUMNS.length - 1);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SURVEY_SHEET_ID,
    range: q(TABS.survey, `A2:${lastCol}`),
  });
  const rows = res.data.values || [];
  const idx = (key) => SURVEY_COLUMNS.findIndex((c) => c.key === key);
  const iCohort = idx('cohort'), iName = idx('name'), iPhone = idx('phone'), iLink = idx('kakaoLink');
  return rows
    .map((row) => ({
      cohort: String(row[iCohort] || '').trim(),
      name: String(row[iName] || '').trim(),
      phone: String(row[iPhone] || '').trim(),
      kakaoLink: String(row[iLink] || '').trim(),
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

async function setupRosterSheet() {
  return setupSpreadsheet(ROSTER_SHEET_ID, [
    { title: TABS.roster, headers: ROSTER_HEADERS },
    { title: TABS.links, headers: LINKS_HEADERS, seedRows: LINKS_SEED_ROWS },
  ]);
}

async function setupSurveySheet() {
  return setupSpreadsheet(SURVEY_SHEET_ID, [
    { title: TABS.survey, headers: SURVEY_HEADERS },
  ]);
}

module.exports = {
  // 기존
  readConfigKeywords,
  appendContentRows,
  // 시민 확인 / 설문
  readRoster,
  readChallengeLinks,
  readSurveySubmissions,
  appendSurveyResponse,
  setupRosterSheet,
  setupSurveySheet,
  // 상수 (문서/테스트용)
  ROSTER_SHEET_ID,
  SURVEY_SHEET_ID,
  TABS,
  ROSTER_HEADERS,
  LINKS_HEADERS,
  SURVEY_HEADERS,
  LINKS_SEED_ROWS,
};
