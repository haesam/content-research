# 프로젝트 1 · 카페 사이트 "NOMA-style" → 우리 브랜드 **HALF PAST** (가칭)

첫 릴스용 사이트입니다. 참고 릴스의 커피 편(`FOLLOW THE POUR.`)과 같은 구조로 가되, 브랜드·카피·색은 우리 것으로 만듭니다.

---

## 1. 기획 (30분 안에 끝내는 한 장짜리 기획서)

### 브랜드 한 줄
> **HALF PAST** — "두 시 반, 오후가 늘어지는 시간의 아이스 라떼."
> 손님이 아니라 *시간*을 파는 동네 카페. 헤드라인은 영어 세리프, 설명은 한국어.

### 사이트의 단 하나의 역할
릴스에서 8초 안에 "이 카페 사이트는 스크롤하면 라떼가 부어진다"를 보여주고, 실제 방문자에게는 위치·시간·예약 버튼 하나를 누르게 하는 것. 그 이상은 만들지 않습니다.

### 히어로 (릴스에 나오는 유일한 화면)

| 요소 | 내용 |
|---|---|
| 아이브로우 | `SEOUL · SINCE 2026` |
| 헤드라인 | `Follow` / `the pour.` (두 줄, 두 번째 줄 이탤릭 골드) |
| 서브카피 | 한 잔이 완성되는 8초를 스크롤로 따라가 보세요. 얼음, 우유, 그리고 천천히 내려앉는 에스프레소. |
| 버튼 | `Find us →` (지도 링크) |
| 영상 동작 | 얼음만 든 빈 유리잔 → 우유가 차오름 → 에스프레소가 위에서 가늘게 떨어져 소용돌이 → 완성된 층이 있는 라떼 |
| 프레임 수 | 120장 (8초 영상) |

### 이후 섹션 (릴스에 안 나오지만 사이트 완성도를 위해 최소한만)

1. **Hours** — 영업시간을 큰 세리프 숫자로. `2:30 PM` 강조 (브랜드 스토리와 연결)
2. **Menu** — 3개만: Half Past Latte / Cold Brew Tonic / Butter Bun. 가격 포함
3. **Find us** — 주소 한 줄 + 지도 버튼 + 인스타 링크
4. 푸터

### 무드 토큰 (`index.html`의 `:root`에 그대로 붙여넣기)

```css
--bg:#f2ece2; --bg-2:#e9e1d4; --ink:#1b1712; --muted:#7a6f61;
--gold:#8a6a3d; --gold-2:#b08a52; --line:rgba(138,106,61,.22);
--serif:"Fraunces","Cormorant Garamond",Georgia,serif;   /* Google Fonts: Fraunces */
```

`.hero__canvas::after`의 그라데이션 색도 `#f2ece2`로 바꿉니다. 영상 배경색을 같은 베이지로 만들기 때문에 화면과 영상의 경계가 사라집니다.

### 릴스 캡션 (미리 써 둠)
> 카페 웹사이트가 가만히 있지 않으면 어떨까요?
> 스크롤을 내리는 만큼 라떼가 부어집니다.
> 댓글에 업종 남겨주시면 다음 편에 만들어 드립니다.

---

## 2. 힉스필드에서 영상 만들기

### 왜 힉스필드인가
- 이 세션에 연동되어 있어 프롬프트만 주면 여기서 바로 생성·확인 가능
- **Kling 3.0이 시작 프레임 + 끝 프레임(키프레임)을 받습니다.** 스크롤 스크럽에는 이게 결정적입니다: "빈 잔" 스틸과 "완성된 라떼" 스틸을 만들어 양 끝에 꽂으면 영상이 반드시 A에서 B로 한 방향으로 갑니다.

### 확인된 모델과 비용 (2026-09-07, 현재 잔액 476 크레딧 · Pro 플랜)

| 단계 | 모델 | 설정 | 비용/회 |
|---|---|---|---|
| 스틸 (시작·끝 프레임) | `nano_banana_pro` | 16:9, 2K | 2 크레딧 (4K는 4) |
| 영상 1순위 | `kling3_0` | 8초, mode `pro`, sound `off`, 16:9, start_image + end_image | 12 크레딧 |
| 영상 저렴 테스트 | `kling3_0` | 8초, mode `std`, sound off | 10 크레딧 |
| 영상 2순위 (2K 해상도) | `minimax_h3` | 8초, start_image + end_image, 2K | 16 크레딧 |
| 영상 고급 (프롬프트 이해력) | `veo3` (veo-3-preview) | start_image만 | 58 크레딧 |
| 참고 | `seedance_2_5` 1080p 8초 | omni_reference | 72 크레딧 (비쌈, 이번 용도엔 불필요) |

**첫 편 예산**: 스틸 2장×2회 시도(8) + Kling pro 3회(36) = 약 45 크레딧. 실패해도 100 크레딧 안에서 끝납니다.

### 순서

**① 시작 프레임 스틸** (`nano_banana_pro`, 16:9, 2k)
```
Editorial product photograph. A tall clear glass filled only with large clear ice cubes, 
completely empty otherwise, standing on a pale beige seamless studio surface and background 
(#f2ece2). Soft window light from the left, gentle shadow to the right. Glass positioned in 
the right two-thirds of the frame, generous empty space on the left. Minimal, warm, quiet. 
No other objects, no text, no straw.
```

**② 끝 프레임 스틸** (`nano_banana_pro`, ①의 결과를 `image_references`로 넣어 같은 잔·같은 조명 유지)
```
Same glass, same camera, same lighting and same beige background as the reference. 
The glass is now a finished iced latte: white milk at the bottom, a distinct layer of dark 
espresso settling on top with soft swirls where they meet, ice cubes visible through the glass. 
A thin last drip of espresso falling from above just about to land. Nothing else changes.
```
→ 두 장을 나란히 놓고 잔의 위치·크기가 같은지 확인. 다르면 ②만 다시 (2 크레딧).

**③ 영상** (`kling3_0`, duration 8, mode pro, sound off, 16:9, medias: ①=`start_image`, ②=`end_image`)
```
Static locked-off camera, no camera movement, no zoom. Milk pours into the glass of ice from 
above and fills it, then a thin stream of espresso pours from the top and swirls slowly into 
the milk, forming layers. One continuous pour, slow motion, no cuts, no loop. Background and 
lighting remain exactly the same throughout.
```
→ 3개 생성해서 (count 3 = 36 크레딧) 가장 매끄러운 것 선택. 기준은 `GUIDE.md` 2단계의 "좋은 컷의 조건".

**④ 다운로드 → 프레임 추출**
```bash
scripts/extract-frames.sh halfpast.mp4 frames/cafe 120 1600 80
```
`index.html`: `data-src="frames/cafe/frame_{i}.webp" data-count="120" data-focus="0.7"` (잔이 오른쪽에 있으므로 0.7)

### 잘 안 나올 때
| 증상 | 처리 |
|---|---|
| 카메라가 움직임 | 프롬프트 맨 앞에 `Static camera, tripod, no camera movement` 를 두 번 반복. 그래도 안 되면 `minimax_h3`로 |
| 중간에 잔 모양이 바뀜 | 끝 프레임 스틸을 다시 만들어 시작 프레임과 더 비슷하게 (같은 reference 사용) |
| 배경이 어두워지거나 색이 변함 | 스틸에서 배경을 더 단순하게(그라데이션 없이) 다시 생성 |
| 부어지는 게 너무 빨리 끝나고 뒤가 정지 | duration을 6초로 줄이거나 프롬프트에 `the pour lasts the entire clip` 추가 |

---

## 3. 이 뒤의 순서 (GUIDE.md 4~7단계)
사이트 교체 → Vercel 배포 → `record.mjs` 녹화 → 노트북 목업 합성 → 릴스 업로드 (캡션은 위에 준비됨).

---

## 4. 생성 기록 (2026-09-07 실행)

| 단계 | 모델 | Job ID | 결과 |
|---|---|---|---|
| ① 시작 스틸 | nano_banana_pro 2K 16:9 | `02896e1d-d74c-4c48-9169-9e2222d3b877` | 완료 (2장 중 1장 실패) |
| ② 끝 스틸 A | nano_banana_pro (①을 reference) | `bd3f13d4-b95d-4ccc-be19-11947f231054` | 완료 → 영상에 사용 |
| ② 끝 스틸 B | 〃 | `4b4a8a24-d3c3-4c55-8a64-d73a7fad283a` | 완료 (예비) |
| ③ 영상 1 | kling3_0 pro 8초 sound off, start=①, end=②A | `f7180a1a-61f8-4475-adde-3b93af763917` | 완료 |
| ③ 영상 2 | 〃 (같은 설정 변형) | `225e7ec8-84fd-4dda-a854-7eb4427c11db` | 완료 |

다운로드 (힉스필드 생성 목록에서도 열립니다):
- 영상 1: https://d8j0ntlcm91z4.cloudfront.net/user_2zKID9uGHH3s9RILDyuHqKJaCTk/hf_20260907_164135_f7180a1a-61f8-4475-adde-3b93af763917.mp4
- 영상 2: https://d8j0ntlcm91z4.cloudfront.net/user_2zKID9uGHH3s9RILDyuHqKJaCTk/hf_20260907_164135_225e7ec8-84fd-4dda-a854-7eb4427c11db.mp4
- 시작 스틸: https://d8j0ntlcm91z4.cloudfront.net/user_2zKID9uGHH3s9RILDyuHqKJaCTk/hf_20260907_163945_02896e1d-d74c-4c48-9169-9e2222d3b877.png
- 끝 스틸 A: https://d8j0ntlcm91z4.cloudfront.net/user_2zKID9uGHH3s9RILDyuHqKJaCTk/hf_20260907_164044_bd3f13d4-b95d-4ccc-be19-11947f231054.png

다음 명령 (본인 PC에서):
```bash
curl -L -o halfpast.mp4 "<위 영상 URL 중 마음에 드는 것>"
scripts/extract-frames.sh halfpast.mp4 frames/cafe 120 1600 80
# index.html → data-src="frames/cafe/frame_{i}.webp" data-count="120" data-focus="0.7"
```
