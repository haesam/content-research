# 스크롤 애니메이션 포트폴리오 → 릴스 → 외주 수주 가이드

참고로 주신 릴스(`polanaeem.tech` 계정)를 프레임 단위로 뜯어보면 모든 영상이 **같은 공식**으로 만들어져 있습니다.

| 구성 요소 | 릴스에서 보이는 것 | 우리가 만들 것 |
|---|---|---|
| ① AI 제품 영상 | 초콜릿이 갈라지며 크림이 차오름, 향수병에 액체가 차오름, 커피 붓기, 말차 휘젓기, 꽃이 핌, 건물이 올라감, 차에 빛줄기 | Kling · Veo · Runway 등으로 5~8초 생성 |
| ② 스크롤 스크럽 히어로 | 스크롤을 내리는 만큼만 영상이 재생됨 (멈추면 멈춤) | 영상을 120장 프레임으로 잘라 캔버스에 그림 (이 폴더의 `index.html`) |
| ③ 카피 | `WATCH IT RISE.` `FOLLOW THE POUR.` `SCROLL INTO THE CRUNCH.` 세 단어짜리 명령문 + 세리프 서체 | 업종마다 한 문장 |
| ④ 촬영 | 맥북 화면을 45도 각도로 찍은 목업, 창은 전체화면 | 자동 녹화 스크립트 + 목업 합성 (또는 실제 노트북 촬영) |
| ⑤ 릴스 포장 | 상단 스티커 `Simple Scroll Animation` / `Wait till end`, 캡션은 "What if a coffee website didn't just sit there…" | 훅 문장 공식 아래 참고 |

영상 하나가 7~15초, 한 컷, 말 없이 음악만. **사이트 전체가 아니라 첫 화면(히어로) 하나**만 보여줍니다. 이게 핵심입니다. 히어로 하나만 완성도 있게 만들면 릴스 한 편이 나옵니다.

---

## 0. 전체 흐름과 소요 시간

```
컨셉(30분) → AI 영상(1~2시간) → 프레임 추출(5분) → 사이트(1~2시간) → 녹화·편집(1시간) → 업로드
```

첫 편은 하루, 익숙해지면 편당 2~3시간입니다. 아래 순서대로 진행하세요.

---

## 1단계. 컨셉: 업종 하나, 동작 하나, 문장 하나

릴스에서 반응이 좋은 업종은 **제품이 "변하는 순간"이 있는 것**입니다. 스크롤과 어울리는 동작은 *되돌아가지 않고 누적되는* 동작입니다 (부어지기, 차오르기, 피어나기, 올라가기, 갈라지기). 왕복하거나 반복되는 동작(회전, 흔들림)은 스크롤과 안 맞습니다.

| 업종 | 동작 (AI 영상 내용) | 헤드라인 예시 |
|---|---|---|
| 카페 | 라떼 위로 우유가 나선으로 부어짐 | FOLLOW THE POUR. |
| 디저트/초콜릿 | 초콜릿이 갈라지며 속이 드러남 | SCROLL INTO THE CRUNCH. |
| 향수 | 빈 병에 액체와 꽃잎이 차오름 | THE SCENT CAME FIRST. |
| 스킨케어 | 스포이트에서 세럼이 떨어져 피부에 스밈 | FOLLOW THE REPAIR. |
| 꽃집/웨딩 | 봉오리가 활짝 핌 | WATCH IT BLOOM. |
| 부동산/건축 | 설계도 선이 올라가며 건물이 됨 | WATCH IT RISE. |
| 자동차/바이크 | 빛줄기가 차체를 감싸고 지나감 | FOLLOW THE ENERGY. |
| 레스토랑 | 빈 접시 위에 소스가 그려지고 플레이팅됨 | DRAWN TO TASTE. |
| 매트/요가/헬스 | 말차 휘젓기처럼 한 방향 동작 | WHISKED TO LIFE. |

**추천 시작 순서**: 카페 → 향수 → 부동산. 카페는 외주 문의가 가장 많이 오고, 향수는 영상이 가장 예쁘게 나오고, 부동산은 단가가 높습니다.

한국 시장용 헤드라인은 영어 세리프 헤드라인 + 한국어 서브카피 조합이 가장 고급스럽게 보입니다.
예: `FOLLOW THE POUR.` / *"한 잔이 완성되는 12초를 스크롤로 따라가 보세요."*

---

## 2단계. AI 영상 만들기

### 도구 (2026년 9월 기준)

| 도구 | 장점 | 용도 |
|---|---|---|
| **Kling 2.x / 3.x** | 액체·질감 표현이 좋고 image-to-video 정확도 높음 | 1순위 |
| **Google Veo 3.x** | 사실적인 조명, 프롬프트 이해력 | 카페·음식 |
| **Runway Gen-4** | 카메라 고정이 잘 됨 | 제품 스틸 기반 |
| **Higgsfield** | 카메라 모션 프리셋, 제품 광고 특화 | 자동차·향수 |
| **Midjourney / Nano Banana / Flux** | 첫 프레임(제품 스틸) 생성 | 모든 케이스의 시작점 |

> 이 세션에는 Higgsfield 연동이 연결되어 있어서, 원하시면 프롬프트를 주시고 여기서 바로 영상을 생성해 드릴 수도 있습니다 (본인 크레딧 사용).

### 워크플로: 스틸 먼저, 영상은 그다음

텍스트→영상으로 바로 만들면 제품이 매 시도마다 달라집니다. **①이미지 생성 → ②마음에 드는 스틸을 첫 프레임으로 image-to-video** 순서가 정석입니다.

1. 제품 스틸 생성 (Midjourney 등)
   ```
   editorial product photo of an iced latte in a tall glass, empty glass with ice only,
   pale beige seamless studio background, soft window light from the left, 
   centered, lots of negative space on the left side, 16:9 --ar 16:9 --style raw
   ```
   *왼쪽에 여백*을 두는 이유: 사이트에서 왼쪽에 헤드라인이 들어갑니다.
2. 그 스틸을 첫 프레임으로 넣고 image-to-video
   ```
   Static camera, locked tripod. Espresso pours from above in a thin stream and swirls 
   into the milk, forming layered latte. Slow motion, continuous single motion, no cuts, 
   no camera movement, background stays exactly the same. 8 seconds.
   ```
3. 결과 3~5개 생성 → 가장 "한 방향으로 매끄럽게 진행되는" 컷 선택
4. 필요하면 Topaz Video AI로 4K·60fps 업스케일 (프레임 뽑을 때 화질이 곧 사이트 화질)

### 프롬프트 공식

```
[고정 카메라 선언] + [피사체] + [한 방향으로 누적되는 동작] + [배경 유지] + [조명/무드] + [길이]
```

반드시 넣을 문구:
- `static camera, locked off, no camera movement` : 카메라가 움직이면 스크롤 스크럽에서 어지럽습니다
- `continuous single motion, no cuts, no loop` : 되감기·컷 전환이 있으면 스크롤을 되돌릴 때 이상합니다
- `background remains unchanged, seamless [색] background` : 배경이 변하면 텍스트 가독성이 깨집니다
- 배경색은 사이트 배경색과 맞춥니다 (베이지 사이트면 베이지 배경, 다크 사이트면 검정)

### 업종별 프롬프트 예시 (그대로 붙여 넣어도 됩니다)

**향수 (차오름)**
```
Static locked-off camera. An empty transparent glass perfume bottle on a warm beige seamless 
background. Amber liquid slowly rises inside the bottle from the bottom while a silk ribbon 
and vanilla pods drift in and settle. Soft studio light, subtle caustics, no camera movement, 
continuous motion, 8 seconds.
```

**초콜릿 (갈라짐)**
```
Static macro camera. A dark chocolate bar on a sage green background. The top layer cracks 
and lifts off, revealing pistachio cream that slowly rises and fills the cavity, then 
shredded pistachio falls from above. Continuous motion, no camera movement, 8 seconds.
```

**꽃 (피어남)**
```
Static camera, minimal white studio. A single pale pink peony bud opens fully in slow motion, 
petals unfolding outward. Timelapse feel but smooth, background unchanged, 8 seconds.
```

**건물 (올라감, 이 템플릿의 데모와 같은 컨셉)**
```
Static camera, night, dark navy background. Thin golden wireframe lines draw a modern 
residential tower from the ground up, floor by floor. Once complete, warm lights turn on 
window by window from bottom to top. Architectural visualization style, no camera movement, 10 seconds.
```

**자동차 (빛줄기)**
```
Static three-quarter view of a black sports car in a dark studio. A single ribbon of orange 
light travels along the body lines from the rear to the front headlight, illuminating the 
surface as it passes. Continuous motion, no camera movement, 8 seconds.
```

**커피 (부어짐)**
```
Static camera, cream background. A tall glass of iced milk. Espresso pours from above in a 
thin stream, swirling into the milk in slow motion and forming layers. Continuous single pour, 
no cuts, background unchanged, 8 seconds.
```

### 좋은 컷의 조건 (셀렉트 기준)

- 첫 프레임이 "비어 있고", 마지막 프레임이 "완성"되어 있다 → 스크롤 시작/끝이 명확
- 중간에 갑자기 형태가 바뀌거나 튀는 프레임이 없다 (스크롤로 되돌리면 그게 다 보입니다)
- 배경 노이즈가 적다 (프레임 용량이 줄어듭니다)

---

## 3단계. 영상 → 프레임 시퀀스

브라우저에서 `<video>`의 재생 위치를 스크롤로 움직이면 끊깁니다. 애플 제품 페이지처럼 **프레임 이미지 120장을 미리 받아 두고 캔버스에 그리는 방식**이 가장 부드럽습니다.

```bash
# ffmpeg 설치: macOS  brew install ffmpeg   /   Windows  winget install ffmpeg
scripts/extract-frames.sh 내영상.mp4 frames/hero 120 1600 80
#                          입력       출력폴더   장수  가로폭 품질
```

결과: `frames/hero/frame_001.webp … frame_120.webp` (보통 3~7MB).

| 설정 | 권장 | 이유 |
|---|---|---|
| 프레임 수 | 100~150 | 스크롤 300vh 기준 1px당 프레임 변화가 자연스러움. 200장 넘으면 로딩이 느려짐 |
| 가로폭 | 1600px (히어로가 화면 절반이면 1200도 충분) | 레티나에서 선명, 용량 타협점 |
| 포맷 | WebP 품질 80 | JPG 대비 30% 작음 |
| 총 용량 | 6MB 이하 | 3초 안에 로딩 (로더 화면 있음) |

---

## 4단계. 사이트 만들기 (이 폴더의 템플릿)

### 바로 실행

```bash
cd scroll-portfolio
node scripts/serve.mjs        # http://localhost:8080
```

데모 프레임(와이어프레임 건물)이 들어 있어서 그대로 열면 동작을 볼 수 있습니다.

### 내 영상으로 교체

`index.html`에서 `<header class="hero">`의 속성만 바꿉니다.

```html
<header class="hero" id="hero"
  data-src="frames/hero/frame_{i}.webp"   <!-- {i} 자리에 번호 -->
  data-count="120"                          <!-- 프레임 수 -->
  data-pad="3"                              <!-- 001 형식 → 3 -->
  data-fit="cover"                          <!-- cover: 꽉 채움 / contain: 여백 -->
  data-focus="0.62">                        <!-- 그림의 가로 기준점. 0.5 중앙, 클수록 오른쪽 -->
```

그다음 카피 3곳: `.eyebrow`(작은 라벨), `h1`(두 줄), `p`(서브카피), 버튼 텍스트.

### 무드 바꾸기

`:root`의 토큰 6개만 바꾸면 전체가 바뀝니다.

| 무드 | `--bg` | `--ink` | `--gold`(포인트) | 서체 |
|---|---|---|---|---|
| 다크 럭셔리 (기본) | `#0b1016` | `#f3ede3` | `#d8b46b` | Cormorant Garamond |
| 베이지 카페 | `#f2ece2` | `#1b1712` | `#8a6a3d` | Playfair Display / Fraunces |
| 세이지 디저트 | `#dfe6d8` | `#1e241c` | `#5c6b48` | DM Serif Display |
| 화이트 스킨케어 | `#f7f6f3` | `#222` | `#c9a58d` | Cormorant + Inter |

밝은 배경으로 바꾸면 `.hero__canvas::after`의 그라데이션 색도 배경색으로 맞춰 주세요 (텍스트 뒤를 배경색으로 살짝 덮어 가독성을 만드는 레이어입니다).

### 동작 원리 (직접 고칠 때 알아야 할 것)

```
.hero          높이 300vh  ← 이 구간을 스크롤하는 동안
 └ .hero__stage sticky 100vh ← 화면은 고정되고
      canvas                ← 스크롤 진행도 0~1 × 프레임수 = 그릴 프레임 번호
```

- `--pin: 300vh` : 값을 키우면 영상이 더 천천히 재생됩니다 (400vh 권장 상한)
- `scrub: 0.6` : 스크롤을 살짝 뒤따라오는 정도. 0이면 즉각, 1이면 묵직
- 이후 섹션은 `.reveal` 클래스만 붙이면 화면에 들어올 때 올라오며 등장합니다
- 라이브러리는 GSAP + ScrollTrigger (`vendor/`에 포함, 2024년부터 상업용 무료)

### 배포

- **Vercel**: vercel.com → Add New → 이 폴더를 드래그. 1분이면 `xxx.vercel.app` 주소가 나옵니다.
- **Netlify Drop**: app.netlify.com/drop 에 폴더 드래그.
- 포트폴리오 링크 하나에 업종별 페이지를 `/cafe`, `/perfume` 식으로 모아두면 DM 답장이 쉬워집니다.

---

## 5단계. 릴스용 영상 녹화

### 방법 A. 자동 녹화 + 목업 합성 (추천, 매번 같은 품질)

```bash
npm i -D playwright && npx playwright install chromium   # 최초 1회
node scripts/serve.mjs                                    # 터미널 1
node scripts/record.mjs "http://localhost:8080/?record=1" recordings 9   # 터미널 2, 9초 동안 스크롤
ffmpeg -i recordings/scroll.webm -c:v libx264 -pix_fmt yuv420p -crf 18 recordings/scroll.mp4
```

`?record=1`은 커서와 스크롤바를 숨기는 옵션입니다. 결과는 1920×1080, 사람이 트랙패드로 미는 것처럼 천천히 시작해 천천히 멈추는 스크롤입니다.

목업 합성:
1. CapCut(데스크톱) 또는 프리미어에서 새 프로젝트 9:16, 1080×1920
2. 노트북 목업 소스: 참고 릴스는 **AI로 만든 맥북 정물 사진**(창가, 나무 책상, 45도)을 배경으로 쓰고 화면 부분에 녹화본을 끼워 넣은 것입니다. 목업 이미지도 Midjourney로 만들면 됩니다:
   ```
   MacBook Pro on a walnut desk by a window, morning light, shallow depth of field, 
   screen is pure solid green, three-quarter angle from the left, photorealistic, 9:16
   ```
   화면을 초록으로 만들어 두면 크로마키로 녹화본을 넣기 편합니다.
3. 녹화본을 화면 위에 올리고 **코너 핀(Corner Pin)**으로 네 모서리 맞춤 → 살짝 화면 반사·그림자 레이어 → 완성
4. 무료 목업이 급하면 ls.graphics, mockup.world의 "MacBook front / angled" PSD를 씁니다.

### 방법 B. 실제 노트북 촬영 (더 진짜 같음)

- 창을 전체화면(F11 / ⌃⌘F), `?record=1`로 열고 화면 밝기 최대, 다크모드 브라우저
- 폰은 4K 60fps, 노출 고정(AE/AF 잠금), 화면에 형광등 반사 없게 각도 조정
- 스크롤은 트랙패드 두 손가락으로 **3초 멈춤 → 6초 천천히 → 2초 멈춤**
- 화면 모아레(줄무늬)가 생기면 셔터 속도를 1/60 또는 1/120으로

---

## 6단계. 릴스 편집 공식

참고 릴스의 구조를 그대로 씁니다.

| 구간 | 화면 | 텍스트 |
|---|---|---|
| 0~1초 | 정지 상태의 히어로 (영상 첫 프레임) | 상단 스티커 `Wait till end` 또는 `Simple Scroll Animation` |
| 1~8초 | 스크롤 진행, 영상이 완성됨 | 없음 (화면이 말하게) |
| 8~10초 | 완성 프레임에서 정지, 살짝 줌인 | 하단에 `@계정` |

- 길이 9~13초. 끝까지 보는 비율이 핵심 지표라 짧을수록 유리합니다.
- 사운드: 잔잔한 R&B/로파이 (참고 계정: Drake God's Plan 느린 버전, Moss and Moon 등). 비트 드롭이 영상 완성 시점에 오도록 맞추면 반응이 달라집니다.
- 자막은 위 스티커 하나만. 화면 안에 설명 자막을 넣지 않습니다.

### 캡션 훅 공식 (참고 릴스 그대로)

```
[업종] 웹사이트가 그냥 가만히 있지 않는다면?
스크롤을 내리는 만큼 [동작]이 진행됩니다.
```

예시:
- "카페 웹사이트가 가만히 있지 않으면 어떨까요? 스크롤만큼 라떼가 부어집니다."
- "향수는 경험입니다. 사이트도 그래야죠. 스크롤을 내리면 향이 병에 담깁니다."
- "분양 사이트에 이런 첫 화면이 있다면, 설명이 필요할까요?"
- "스킨케어 사이트가 '흡수'를 보여줄 수 있다면."

마지막 줄은 항상 같은 CTA: **"댓글에 업종 남겨주시면 다음 편에 만들어 드립니다"** → 댓글이 늘고, 그 댓글이 잠재 고객 리스트가 됩니다.

해시태그는 5~8개: `#웹사이트제작 #홈페이지제작 #랜딩페이지 #웹디자인 #스크롤애니메이션 #카페창업 #브랜딩 #웹개발외주`

---

## 7단계. 업로드·운영·외주 전환

**업로드 리듬**: 주 3편, 업종을 돌아가며. 같은 형식이 10편 쌓이면 계정 자체가 포트폴리오가 됩니다.

**프로필**
- 소개: "스크롤하면 움직이는 웹사이트를 만듭니다 · 카페/브랜드/분양"
- 링크: 포트폴리오 사이트 (업종별 데모 모아둔 페이지)
- 하이라이트: 업종별로 릴스 묶기

**문의 → 수주 흐름**
1. 댓글/DM → "어떤 업종이세요?" 한 줄로 답하고 해당 데모 링크 전송
2. 견적표 PDF 1장 (아래 표 참고) + "제작 기간 7일"
3. 계약금 50% 입금 후 시작, 완료 후 50%
4. 납품 후 그 사이트로 릴스 한 편 더 (고객 허락 받고) → 다음 고객 유입

**가격 참고** (한국 프리랜서 시장 감각, 상황에 따라 조정)

| 상품 | 포함 | 가격대 |
|---|---|---|
| 히어로 1섹션 (원페이지) | AI 영상 1개 + 스크롤 히어로 + 소개/문의 섹션 | 80~150만원 |
| 브랜드 랜딩 (5섹션) | 위 + 메뉴/제품/갤러리/지도, 모바일 최적화 | 150~300만원 |
| 분양/자동차 프리미엄 | 영상 2~3개, 섹션별 스크롤 연출, 반응형 | 300만원 이상 |
| 유지보수 | 월 콘텐츠 교체 2회 | 월 10~20만원 |

AI 영상 제작비(구독료·크레딧)와 수정 2회까지 포함이라고 명시하세요. 3회부터 회당 추가 요금.

---

## 2주 실행 계획

| 일 | 할 일 |
|---|---|
| 1~2 | 이 템플릿 실행해 보고 무드·카피 바꿔 보기. 카페 컨셉 확정 |
| 3 | 스틸 + AI 영상 생성 (5회 시도 중 1개 선택) |
| 4 | 프레임 추출 → 사이트 교체 → Vercel 배포 |
| 5 | 녹화 → 목업 합성 → 릴스 1편 업로드 |
| 6~7 | 향수 편 (같은 순서, 절반 시간) |
| 8~9 | 부동산 편 |
| 10 | 포트폴리오 허브 페이지 (세 데모 링크) + 프로필 정리 + 견적표 |
| 11~14 | 3편 더, 댓글 반응 보고 업종 정하기 |

---

## 업로드 전 체크리스트

- [ ] 영상 첫 프레임이 "비어 있고" 마지막 프레임이 "완성"인가
- [ ] 스크롤을 위로 되돌려도 자연스러운가 (릴스에서 되감는 연출을 넣어도 됨)
- [ ] 총 프레임 용량 6MB 이하, 로더가 2초 안에 사라지는가
- [ ] 모바일(폰 브라우저)에서도 히어로가 깨지지 않는가 (텍스트가 아래로 내려감)
- [ ] 헤드라인이 3단어 이내인가
- [ ] 릴스 0~1초에 스티커가 있고, 8~10초에 완성 프레임 정지가 있는가
- [ ] 캡션 마지막 줄에 "댓글에 업종 남겨주세요" CTA가 있는가
- [ ] 프로필 링크가 데모 페이지로 연결되는가
