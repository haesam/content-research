// 가짜 시트로 띄운 dev 서버에 대해 브라우저로 전체 흐름을 밟아본다.
//   NODE_PATH=$(npm root -g) node scripts/e2e-check.js [baseUrl] [screenshotDir]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3000';
const SHOTS = process.argv[3] || path.join(__dirname, '..', '.e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  // 외부 CDN(폰트/three.js) 로드 실패는 흐름과 무관하므로 무시하고, 스크립트 오류만 잡는다
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  // 무거운 3D 배경은 흐름 검증과 무관하니 차단 (THREE 없을 때의 폴백도 같이 검증됨)
  await page.route('**/three.min.js', (r) => r.abort());

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off', { timeout: 5000 });

  // CTA → 시민 확인
  await page.click('.cta a');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, '01-verify.png'), fullPage: false });

  // 틀린 정보
  await page.fill('#vName', '홍길동');
  await page.fill('#vPhone', '0000');
  await page.click('#verifyBtn');
  await page.waitForSelector('#verifyAlert:not([hidden])');
  const alertText = await page.textContent('#verifyAlert');
  if (!alertText.includes('시민 명단에서 확인되지 않았어요')) throw new Error('unexpected alert: ' + alertText);
  await page.screenshot({ path: path.join(SHOTS, '02-verify-fail.png') });

  // 맞는 정보 → 설문
  await page.fill('#vPhone', '5678');
  await page.click('#verifyBtn');
  await page.waitForSelector('[data-stage="survey"]:not([hidden])');
  if ((await page.inputValue('#fCohort')) !== '3기') throw new Error('cohort not prefilled');
  if (!(await page.$eval('#fCohort', (el) => el.readOnly))) throw new Error('cohort should be locked');
  if (!(await page.textContent('#chipPhone')).includes('010-****-5678')) throw new Error('masked phone missing');
  await page.screenshot({ path: path.join(SHOTS, '03-step1.png') });

  // step1 → step2 (빈칸 검증)
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="2"]:not([hidden])');
  await page.click('#nextBtn');
  const invalidCount = await page.locator('.step[data-step="2"] .field.invalid').count();
  if (invalidCount < 4) throw new Error('step2 validation did not flag empty fields: ' + invalidCount);
  await page.screenshot({ path: path.join(SHOTS, '04-step2-invalid.png') });

  await page.fill('#fAge', '40대 후반');
  await page.selectOption('#fGender', '여성');
  await page.fill('#fRegion', '서울 마포');
  await page.fill('#fMajor', '시각디자인');
  await page.fill('#fPromo', 'https://instagram.com/me\nme@example.com');
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="3"]:not([hidden])');
  await page.fill('#fHelp', '도움된 점');
  await page.fill('#fConcern', '고민');
  await page.fill('#fEffort', '노력과 한계');
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="4"]:not([hidden])');
  await page.fill('#fExpect', '바라는 점');
  await page.fill('#fCommit', '다짐');
  await page.screenshot({ path: path.join(SHOTS, '05-step4.png') });

  // 임시저장 확인: 새로고침 후 다시 인증하면 값이 남아 있어야 한다
  const draft = await page.evaluate(() => localStorage.getItem('nadaun_citizen_draft_v1'));
  if (!draft || !draft.includes('다짐')) throw new Error('draft not saved');

  await page.click('#submitBtn');
  await page.waitForSelector('[data-stage="done"]:not([hidden])');
  const href = await page.getAttribute('#kakaoBtn', 'href');
  if (href !== 'https://open.kakao.com/o/fake-3gi') throw new Error('kakao link wrong: ' + href);
  if (!(await page.textContent('#doneTitle')).includes('홍길동')) throw new Error('name missing on done');
  const draftAfter = await page.evaluate(() => localStorage.getItem('nadaun_citizen_draft_v1'));
  if (draftAfter) throw new Error('draft should be cleared after submit');
  await page.screenshot({ path: path.join(SHOTS, '06-done.png') });

  // 재방문: 이미 제출 → 바로 링크
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off');
  await page.fill('#vName', '홍길동');
  await page.fill('#vPhone', '5678');
  await page.click('#verifyBtn');
  await page.waitForSelector('[data-stage="done"]:not([hidden])');
  if (!(await page.textContent('#doneTitle')).includes('다시 오셨군요')) throw new Error('returning citizen copy missing');
  await page.screenshot({ path: path.join(SHOTS, '07-returning.png') });

  // 기수 없는 시민 + 링크 미등록 → 안내 박스
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off');
  await page.fill('#vName', '김영희');
  await page.fill('#vPhone', '1111');
  await page.click('#verifyBtn');
  await page.waitForSelector('[data-stage="survey"]:not([hidden])');
  if (await page.$eval('#fCohort', (el) => el.readOnly)) throw new Error('cohort should be editable');
  await page.fill('#fCohort', '5기');
  await page.click('#nextBtn');
  await page.fill('#fAge', '29'); await page.selectOption('#fGender', '남성'); await page.fill('#fRegion', '부산'); await page.fill('#fMajor', '경영'); await page.fill('#fPromo', 'https://x');
  await page.click('#nextBtn');
  await page.fill('#fHelp', 'a'); await page.fill('#fConcern', 'b'); await page.fill('#fEffort', 'c');
  await page.click('#nextBtn');
  await page.fill('#fExpect', 'd'); await page.fill('#fCommit', 'e');
  await page.click('#submitBtn');
  await page.waitForSelector('[data-stage="done"]:not([hidden])');
  if (!(await page.isVisible('#noLinkBox'))) throw new Error('no-link box should show');
  if (await page.isVisible('#kakaoBtn')) throw new Error('kakao button should be hidden');
  await page.screenshot({ path: path.join(SHOTS, '08-done-nolink.png') });

  // 데스크톱 폭에서 한 장
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desk.route('**/three.min.js', (r) => r.abort());
  await desk.goto(BASE + '/#citizen', { waitUntil: 'domcontentloaded' });
  await desk.waitForSelector('#loader.off');
  await desk.waitForTimeout(500);
  await desk.screenshot({ path: path.join(SHOTS, '09-desktop-verify.png') });

  await browser.close();
  if (errors.length) throw new Error('browser errors:\n' + errors.join('\n'));
  console.log('e2e OK — screenshots in', SHOTS);
}

main().catch((e) => { console.error('e2e FAILED:', e.message); process.exit(1); });
