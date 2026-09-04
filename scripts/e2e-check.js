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
  if ((await page.evaluate(() => scrollY)) !== 0) throw new Error('page should not auto-scroll on load');

  // CTA → 설문 1단계
  await page.click('.cta a');
  await page.waitForTimeout(400);
  if (!(await page.isVisible('.step[data-step="1"]'))) throw new Error('step1 not visible');
  await page.screenshot({ path: path.join(SHOTS, '01-step1.png') });

  // 빈칸 + 잘못된 연락처 검증
  await page.fill('#fName', '홍길동');
  await page.fill('#fPhone', '1234');
  await page.click('#nextBtn');
  if (!(await page.isVisible('.step[data-step="1"]'))) throw new Error('should stay on step1');
  const invalid1 = await page.locator('.step[data-step="1"] .field.invalid').count();
  if (invalid1 < 2) throw new Error('step1 validation did not flag phone/cohort: ' + invalid1);
  await page.screenshot({ path: path.join(SHOTS, '02-step1-invalid.png') });

  // 연락처 자동 하이픈
  await page.fill('#fPhone', '');
  await page.type('#fPhone', '01012345678');
  if ((await page.inputValue('#fPhone')) !== '010-1234-5678') throw new Error('phone not auto-formatted: ' + await page.inputValue('#fPhone'));
  await page.fill('#fCohort', '3기');
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="2"]:not([hidden])');

  await page.click('#nextBtn');
  const invalid2 = await page.locator('.step[data-step="2"] .field.invalid').count();
  if (invalid2 < 4) throw new Error('step2 validation did not flag empty fields: ' + invalid2);
  await page.fill('#fAge', '40대 후반');
  await page.selectOption('#fGender', '여성');
  await page.fill('#fRegion', '서울 마포');
  await page.fill('#fMajor', '시각디자인');
  await page.fill('#fPromo', 'https://instagram.com/me\nme@example.com');
  await page.screenshot({ path: path.join(SHOTS, '03-step2.png') });
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="3"]:not([hidden])');
  await page.fill('#fHelp', '도움된 점');
  await page.fill('#fConcern', '고민');
  await page.fill('#fEffort', '노력과 한계');
  await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="4"]:not([hidden])');
  await page.fill('#fExpect', '바라는 점');
  await page.fill('#fCommit', '다짐');
  await page.screenshot({ path: path.join(SHOTS, '04-step4.png') });

  // 임시저장: 새로고침해도 값이 남아 있어야 한다
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off');
  if ((await page.inputValue('#fName')) !== '홍길동') throw new Error('draft not restored');
  for (let i = 0; i < 3; i++) await page.click('#nextBtn');
  await page.waitForSelector('.step[data-step="4"]:not([hidden])');

  await page.click('#submitBtn');
  await page.waitForSelector('[data-stage="done"]:not([hidden])');
  const href = await page.getAttribute('#kakaoBtn', 'href');
  if (href !== 'https://open.kakao.com/o/fake-3gi') throw new Error('kakao link wrong: ' + href);
  if (!(await page.textContent('#doneTitle')).includes('홍길동')) throw new Error('name missing on done');
  if (await page.evaluate(() => localStorage.getItem('nadaun_survey_draft_v2'))) throw new Error('draft should be cleared after submit');
  await page.screenshot({ path: path.join(SHOTS, '05-done.png') });

  // 같은 연락처로 재제출 → 이미 제출, 바로 링크
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off');
  await page.fill('#fName', '홍길동'); await page.fill('#fPhone', '010-1234-5678'); await page.fill('#fCohort', '3기');
  await page.click('#nextBtn');
  await page.fill('#fAge', '29'); await page.selectOption('#fGender', '여성'); await page.fill('#fRegion', '서울'); await page.fill('#fMajor', '경영'); await page.fill('#fPromo', 'https://x');
  await page.click('#nextBtn');
  await page.fill('#fHelp', 'a'); await page.fill('#fConcern', 'b'); await page.fill('#fEffort', 'c');
  await page.click('#nextBtn');
  await page.fill('#fExpect', 'd'); await page.fill('#fCommit', 'e');
  await page.click('#submitBtn');
  await page.waitForSelector('[data-stage="done"]:not([hidden])');
  if (!(await page.textContent('#doneTitle')).includes('다시 오셨군요')) throw new Error('returning copy missing');
  await page.screenshot({ path: path.join(SHOTS, '06-returning.png') });

  // 링크 미등록 기수 → 안내 박스
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loader.off');
  await page.fill('#fName', '김영희'); await page.fill('#fPhone', '010-9999-1111'); await page.fill('#fCohort', '5기');
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
  await page.screenshot({ path: path.join(SHOTS, '07-done-nolink.png') });

  // 데스크톱 폭에서 한 장
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desk.route('**/three.min.js', (r) => r.abort());
  await desk.goto(BASE + '/#citizen', { waitUntil: 'domcontentloaded' });
  await desk.waitForSelector('#loader.off');
  await desk.waitForTimeout(600);
  await desk.screenshot({ path: path.join(SHOTS, '08-desktop.png') });

  await browser.close();
  if (errors.length) throw new Error('browser errors:\n' + errors.join('\n'));
  console.log('e2e OK — screenshots in', SHOTS);
}

main().catch((e) => { console.error('e2e FAILED:', e.message); process.exit(1); });
