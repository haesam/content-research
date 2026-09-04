# content-research

이 저장소에는 두 가지가 들어 있습니다.

1. **유튜브 파이프라인** (`api/cron/fetch-youtube.js`) — 매일 아침 6시(KST) config 탭의 키워드로 "구독자 대비 조회수 배율이 높은" 영상을 찾아 contents 탭에 저장
2. **나다운타운 시민 입장 · 설문 사이트** (`public/index.html` + `api/survey/*`) — 수강생이 설문 작성 → 구글시트 저장 → 챌린지 단톡방 링크 안내

---

## 파일 구조

```
public/index.html            ← 나다운타운 페이지 (3D 히어로 + 설문 4단계 + 완료 화면)
api/survey/submit.js         ← POST 설문 제출 (시트 저장 → 단톡 링크 반환)
api/survey/setup.js          ← GET  최초 1회 시트 양식(탭·헤더) 생성 (SETUP_SECRET 필요)
api/cron/fetch-youtube.js    ← 유튜브 크론
lib/sheets.js                ← 구글시트 읽기/쓰기 (두 기능 공용)
lib/survey.js                ← 검증·행 조립·링크 선택 (순수 로직)
lib/ratelimit.js             ← 반복 제출 방지용 간단한 요청 제한
scripts/dev-server.js        ← 로컬 실행 (가짜 시트, 구글 인증 불필요)
scripts/e2e-check.js         ← 브라우저로 전체 흐름 자동 점검
test/                        ← 단위 테스트 (node --test)
vercel.json                  ← 크론 스케줄
```

---

## 나다운타운 사이트 — 처음 세팅하는 순서

### 1) 환경변수 (Vercel 프로젝트 설정 → Environment Variables)

| 이름 | 설명 |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 서비스 계정 JSON 전체 (기존 유튜브 파이프라인과 같은 값 재사용) |
| `SETUP_SECRET` | 시트 양식 생성 엔드포인트를 보호하는 비밀 문자열. 아무 긴 랜덤 문자열 (예: 32자) |
| `GOOGLE_SURVEY_SHEET_ID` | (선택) 챌린지신청자 시트 ID. 비워두면 `12oqxXE3giBnlTjxLdhOePiyK4Ml47dkQK_39VGGgffE` |

### 2) 구글시트 공유

서비스 계정 이메일은 `GOOGLE_SERVICE_ACCOUNT_KEY` JSON 안의 `client_email` 값입니다 (`xxx@xxx.iam.gserviceaccount.com`).

- **챌린지신청자 시트**에 서비스 계정 이메일을 **편집자**로 공유 (앱이 행을 추가하고 링크 탭을 읽음)
- 사람 공유는 본인 + 결과를 봐야 하는 최소 인원만, 이메일 지정으로
- "링크가 있는 모든 사용자" 공유는 **끄기** (제한됨 상태 유지)
- 사이트 주소 자체가 입장 조건이므로, 주소는 수강생에게만 전달하고 공개 채널에 올리지 않기

### 3) 배포 후 시트 양식 만들기 (최초 1회)

브라우저 주소창에 (SETUP_SECRET 값을 넣어서):

```
https://<프로젝트이름>.vercel.app/api/survey/setup?key=<SETUP_SECRET>
```

정상이면 아래처럼 응답하고, 시트에 `설문응답`·`챌린지링크` 탭과 헤더(굵게, 첫 행 고정)가 생깁니다. 이미 있으면 건드리지 않습니다.

```json
{ "ok": true, "survey": { "created": ["설문응답", "챌린지링크"], ... } }
```

### 4) 시트에 내용 채우기

**`챌린지링크` 탭** (직접 입력)

| 기수 | 카카오톡 단톡 링크 | 활성(TRUE/FALSE) | 메모 |
|---|---|---|---|
| 전체 | https://open.kakao.com/o/... | TRUE | 기수별 링크가 없을 때 쓰는 기본 링크 |
| 3기 | https://open.kakao.com/o/... | TRUE | |

- 수강생이 입력한 기수와 같은 행이 있으면 그 링크, 없으면 `전체` 행의 링크를 씀
- 링크가 비어 있으면 완료 화면에 "준비되는 대로 안내" 문구가 뜸. 나중에 링크를 넣으면, 수강생이 같은 연락처로 다시 제출해도 새 행이 생기지 않고 바로 링크가 보임
- 활성 칸을 비워두면 TRUE로 간주, `FALSE`로 쓰면 그 링크는 무시

**`설문응답` 탭** (앱이 자동으로 채움)

| 제출일시 | 기수 | 성함 | 닉네임 | 연락처 | 연령대 | 성별 | 지역 | 전공 | 홍보·영업 문의용 링크 | 교육에서 도움된 점 및 성과 | 현재 고민 | 시도해본 노력과 한계 | 이후 커뮤니티에서 바라는 점 | 앞으로의 다짐 | 안내된 단톡 링크 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- 연락처는 `010-1234-5678` 형태로 통일해서 저장
- 같은 연락처로 두 번 제출하면 두 번째는 저장하지 않고 기존 링크만 다시 안내

---

## 동작 흐름

```
[시민 입장하기] → 설문 4단계 (임시저장: 브라우저 localStorage)
   → POST /api/survey/submit
        ├─ 같은 연락처가 이미 있음 → 기존 링크 반환 (행 추가 안 함)
        └─ 새 제출 → 설문응답 탭에 추가 → 기수에 맞는 링크 반환
   → 완료 화면: 단톡방 입장 버튼 / 링크 없으면 안내 문구
```

보안 처리:
- 같은 IP에서 제출 8회/10분 초과 시 429
- 서버 로그에 요청 본문(이름·연락처)을 남기지 않음
- 응답은 링크와 성공 여부만 담고, 다른 수강생 정보는 내려보내지 않음
- 페이지에 `noindex` 메타 (검색 노출 방지)

---

## 로컬에서 돌려보기 (구글 인증 없이)

```
npm install
npm run dev:local          # http://localhost:3000  (가짜 링크: 3기 → 테스트 링크, 그 외 → 링크 없음)
npm test                   # 단위 테스트
NODE_PATH=$(npm root -g) npm run e2e   # 브라우저 흐름 점검 (playwright 필요)
```

실제 시트로 확인하려면 `vercel dev` 또는 `REAL_SHEETS=1 GOOGLE_SERVICE_ACCOUNT_KEY=... npm run dev:local`.

---

## 유튜브 파이프라인 (기존)

배포 후 수동 실행:

```
https://<프로젝트이름>.vercel.app/api/cron/fetch-youtube
```

정상이면 `{ "success": true, "keywordsChecked": 9, "rowsAdded": 12 }` 형태로 응답하고 contents 탭에 행이 쌓입니다.
환경변수 `YOUTUBE_API_KEY`, `GOOGLE_SHEET_ID`, `CRON_SECRET`(선택)이 필요합니다.

---

## 문제가 생기면

- `SETUP_SECRET 환경변수를 먼저 설정하세요` → Vercel 환경변수 추가 후 재배포
- setup 응답에 `편집자로 공유되어 있는지 확인` → 시트에 서비스 계정 이메일을 편집자로 공유
- 제출이 계속 실패(잠시 문제가 생겼어요) → 시트 탭 이름이 `설문응답`, `챌린지링크`인지, 서비스 계정 권한이 편집자인지 확인
- 완료 화면에 링크가 안 뜸 → `챌린지링크` 탭에 해당 기수 또는 `전체` 행의 링크가 채워져 있는지, 활성이 FALSE가 아닌지 확인
- `GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 없습니다` → Vercel 환경변수 등록 여부와 Production 체크 확인
