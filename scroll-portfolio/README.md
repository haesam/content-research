# scroll-portfolio

스크롤 스크럽(scroll-scrub) 히어로 랜딩 템플릿 + 릴스 제작 파이프라인.

- `GUIDE.md` — 컨셉 → AI 영상 → 프레임 → 사이트 → 녹화 → 릴스 → 외주까지 단계별 가이드 (먼저 읽으세요)
- `index.html` — 템플릿. `<header class="hero">`의 `data-*` 속성과 카피만 바꾸면 됩니다
- `frames/demo/` — 데모용 120프레임 (와이어프레임 건물). 실제 작업에서는 AI 영상을 잘라 교체
- `vendor/` — GSAP 3.15 + ScrollTrigger (CDN 없이 동작)
- `scripts/extract-frames.sh` — mp4 → webp 프레임 시퀀스 (ffmpeg)
- `scripts/serve.mjs` — 로컬 서버 (`node scripts/serve.mjs`)
- `scripts/record.mjs` — 자동 스크롤 화면 녹화 → 릴스 소재 (Playwright)
- `scripts/make-demo-frames.py` — 데모 프레임 생성기 (참고용)

```bash
node scripts/serve.mjs            # http://localhost:8080 에서 확인
scripts/extract-frames.sh my.mp4 frames/hero 120   # 내 영상으로 교체할 때
```
