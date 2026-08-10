const { google } = require('googleapis');

// 환경변수의 서비스 계정 JSON을 파싱해서 인증 클라이언트를 만든다
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

// config 탭에서 키워드 목록을 읽어온다
// 반환 형태: [{ keyword, keyword_en, group, active }, ...]
async function readConfigKeywords() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'config!A2:D100', // 1행은 헤더이므로 2행부터
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

// contents 탭에 새 행들을 이어붙인다
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

module.exports = { readConfigKeywords, appendContentRows };
