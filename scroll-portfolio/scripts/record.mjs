/**
 * 사이트를 자동으로 부드럽게 스크롤하며 화면 녹화 → 릴스 소재(webm)
 * 사용: node scripts/record.mjs [url=http://localhost:8080/?record=1] [out=recordings] [duration=9]
 * 준비: npm i -D playwright  (브라우저는 npx playwright install chromium)
 * 결과 webm 은 CapCut/프리미어에 바로 올리거나 ffmpeg 로 mp4 변환:
 *   ffmpeg -i recordings/scroll.webm -c:v libx264 -pix_fmt yuv420p -crf 18 scroll.mp4
 */
import { chromium } from 'playwright';
import { rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:8080/?record=1';
const outDir = process.argv[3] || 'recordings';
const seconds = +(process.argv[4] || 9);
const W = 1920, H = 1080;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: W, height: H } },
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(1800);           // 텍스트 등장 애니메이션 기다림

// 실제 사람이 트랙패드로 미는 느낌: easeInOut 으로 목표 지점까지 rAF 스크롤
await page.evaluate(async (seconds) => {
  const hero = document.getElementById('hero');
  const target = hero.offsetHeight - innerHeight + innerHeight * 0.8;   // 핀 끝 + 다음 섹션 살짝
  const t0 = performance.now(), dur = seconds * 1000;
  const ease = t => -(Math.cos(Math.PI * t) - 1) / 2;   // easeInOutSine: 트랙패드 느낌
  await new Promise(res => {
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      scrollTo(0, ease(p) * target);
      p < 1 ? requestAnimationFrame(step) : res();
    })(t0);
  });
}, seconds);
await page.waitForTimeout(1200);
const video = page.video();
await ctx.close(); await browser.close();
const tmp = await video.path();
const out = path.join(outDir, 'scroll.webm');
await rename(tmp, out);
console.log('✔ saved', out);
