# nad-challenge (나다운타운 챌린지)

이 저장소에는 세 가지가 들어 있습니다.

1. **유튜브 파이프라인** (`api/cron/fetch-youtube.js`) — 매일 아침 6시(KST) config 탭의 키워드로 "구독자 대비 조회수 배율이 높은" 영상을 찾아 contents 탭에 저장
2. **나다운타운 시민 입장 · 설문 사이트** (`public/index.html` + `api/survey/*`) — 수강생이 설문 작성 → 구글시트 저장 → 챌린지 단톡방 링크 안내
3. **홈페이지 진단 웹서비스** (`public/diagnosis/index.html` + `api/diagnosis/*`) — 교회·비영리단체·전문직 사무소·소상공인이 대상을 고르고 3분 진단을 받은 뒤, 리포트를 보고 연락처를 남기면 리드가 구글시트에 쌓임

---

## 파일 구조

```
public/index.html            ← 나다운타운 페이지 (3D 히어로 + 설문 4단계 + 완료 화면)
api/survey/submit.js         ← POST 설문 제출 (시트 저장 → 단톡 링크 반환)
api/survey/lookup.js         ← POST 성함+연락처가 기존 제출과 일치하면 설문 없이 바로 단톡방 안내
api/survey/setup.js          ← GET  최초 1회 시트 양식(탭·헤더) 생성 (SETUP_SECRET 필요)
api/survey/health.js         ← GET  배포 진단: 환경변수·시트 권한·탭 점검 + 해결 방법 (SETUP_SECRET 필요)
api/cron/fetch-youtube.js    ← 유튜브 크론

public/diagnosis/index.html  ← 홈페이지 진단 페이지 (대상 선택 → 훅 랜딩 → 12문항 → 리포트 → 리드 폼)
api/diagnosis/config.js      ← GET  대상별 카피·문항·축 정보 (비밀 아님, 프런트가 그대로 내려받음)
api/diagnosis/submit.js      ← POST 진단 제출 (점수 서버 재계산 → 시트 저장 → 점수 반환)
api/diagnosis/setup.js       ← GET  최초 1회 시트 양식(탭·헤더) 생성 (SETUP_SECRET 필요)
api/diagnosis/health.js      ← GET  배포 진단: 환경변수·시트 권한·탭 점검 + 해결 방법 (SETUP_SECRET 필요)
lib/diagnosis.js             ← 대상별 카피·문항·채점·등급·리드 검증 (순수 로직)

lib/sheets.js                ← 구글시트 읽기/쓰기 (세 기능 공용)
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

정상이면 아래처럼 응답하고, 시트에 `설문응답`·`챌린지링크` 탭과 헤더(굵게, 첫 행 고정)가 생깁니다. 이미 있으면 데이터는 건드리지 않고, 열 제목 문구가 코드와 달라졌을 때만 1행을 최신 문구로 맞춥니다(`headersUpdated`). 설문 항목명을 바꾼 뒤 이 주소를 한 번 더 열면 시트 제목도 따라 바뀝니다.

```json
{ "ok": true, "survey": { "created": ["설문응답", "챌린지링크"], ... } }
```

### 4) 시트에 내용 채우기

**`챌린지링크` 탭** (제출 후 안내할 단톡방 목록 — 초기화 때 아래 3개 행이 자동으로 채워짐)

| 단톡방 이름 | 카카오톡 단톡 링크 | 입장 암호 | 활성(TRUE/FALSE) | 메모 |
|---|---|---|---|---|
| 콘텐츠 챌린지 단톡방 | https://open.kakao.com/o/guCDOQLi | 2631 | TRUE | |
| 제작 챌린지 단톡방 | https://open.kakao.com/o/gpPEPQLi | 2631 | TRUE | |
| 영업 챌린지 단톡방 | https://open.kakao.com/o/gV49PQLi | 2631 | TRUE | |

- 완료 화면에 활성 상태인 방이 모두 버튼으로 나열되고, 수강생이 원하는 방을 골라 입장 (여러 방 가능)
- 모든 방의 암호가 같으면 화면 위에 암호를 한 번 크게 표시 (복사 버튼 포함), 방마다 다르면 버튼마다 표시
- 방을 바꾸거나 추가/삭제, 암호 변경은 이 탭만 고치면 됨 (코드 수정 불필요)
- 활성 칸을 비워두면 TRUE로 간주, `FALSE`로 쓰면 그 방은 숨김. 전부 숨기면 완료 화면에 "준비되는 대로 안내" 문구가 뜸
- 이 탭이 아예 비어 있거나(초기화 전) 읽을 수 없으면, 코드에 내장된 위 3개 방이 기본으로 안내됨 (`lib/survey.js`의 `DEFAULT_ROOMS`)

**`설문응답` 탭** (앱이 자동으로 채움)

| 제출일시 | 기수 | 성함 | 닉네임 | 연락처 | 연령대 | 성별 | 지역 | 전공 | 홍보·영업 문의용 링크 | 교육에서 도움된 점 및 구체적인 성과(수익) | 현재 고민 | 시도해본 노력과 한계 | 이후 커뮤니티에서 바라는 점 | 앞으로의 다짐 | 안내된 단톡방 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- 연락처는 `010-1234-5678` 형태로 통일해서 저장
- 같은 연락처로 두 번 제출하면 두 번째는 저장하지 않고 단톡방 목록만 다시 안내

---

## 동작 흐름

```
[시민 입장하기] → 설문 1단계(성함·연락처·닉네임·기수)
   → '다음' 클릭 시 POST /api/survey/lookup
        └─ 성함+연락처가 기존 제출과 일치 → 2~4단계 건너뛰고 바로 완료 화면(단톡방 목록)
   → 설문 2~4단계 (임시저장: 브라우저 localStorage)
   → POST /api/survey/submit
        ├─ 같은 연락처가 이미 있음 → 단톡방 목록만 반환 (행 추가 안 함)
        └─ 새 제출 → 설문응답 탭에 추가 → 단톡방 목록 반환
   → 완료 화면: 입장 암호 + 단톡방 버튼(콘텐츠/제작/영업) 중 원하는 곳 선택 / 방이 없으면 안내 문구
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
npm run dev:local          # http://localhost:3000  (가짜 시트: 내장 3개 단톡방이 안내됨)
npm test                   # 단위 테스트
NODE_PATH=$(npm root -g) npm run e2e   # 브라우저 흐름 점검 (playwright 필요)
```

실제 시트로 확인하려면 `vercel dev` 또는 `REAL_SHEETS=1 GOOGLE_SERVICE_ACCOUNT_KEY=... npm run dev:local`.

---

## 홈페이지 진단 웹서비스 (`/diagnosis/`)

교회·비영리단체·전문직 사무소(노무사·회계사·변호사·세무사)·소상공인을 대상으로, 대상 선택 →
분기별 훅 랜딩 → 6개 축(모바일·첫인상·신뢰 신호·구조/동선·행동 유도·검색 노출) × 2문항(총 12문항)
진단 → 처리 중 연출 → 개인화 리포트(레이더 차트·대조군 비교·긴급성) → 연락처를 남기면 "개선
시안 미리보기" 해제, 순서로 이어지는 리드 수집 페이지입니다. 링크에 `?target=church`처럼 대상을
지정해서 보내면 대상 선택 화면을 건너뛰고 바로 훅 랜딩으로 진입합니다(DM 발송용).

문항 점수는 브라우저에서 즉시 계산해 리포트를 보여주고, 제출 시 서버가 `answers`로부터 점수를
다시 계산해 저장합니다(클라이언트 값을 그대로 믿지 않음).

### 1) 환경변수

| 이름 | 설명 |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 서비스 계정 JSON 전체 (기존 기능들과 같은 값 재사용) |
| `SETUP_SECRET` | 시트 양식 생성 엔드포인트를 보호하는 비밀 문자열 (기존 기능들과 같은 값 재사용 가능) |
| `GOOGLE_DIAGNOSIS_SHEET_ID` | **필수.** 진단 리드를 저장할 구글시트 ID. 나다운타운 설문과 완전히 다른 대상을 다루므로 기본값이 없습니다 — 반드시 새 스프레드시트를 만들어 ID를 넣으세요. |

서비스 계정 이메일(`GOOGLE_SERVICE_ACCOUNT_KEY`의 `client_email`)을 그 시트에 **편집자**로 공유하세요.

### 2) 배포 후 시트 양식 만들기 (최초 1회)

```
https://<프로젝트이름>.vercel.app/api/diagnosis/setup?key=<SETUP_SECRET>
```

`홈페이지진단리드` 탭과 헤더(제출일시·대상유형·종합점수·등급·6축 점수·최저축·이름·연락처·기관명·관심분야)가
생깁니다. 이미 있으면 데이터는 건드리지 않습니다. (첫 제출 때 탭이 없으면 자동으로도 만들어집니다.)

### 3) 로컬에서 돌려보기

```
npm run dev:local          # http://localhost:3000/diagnosis/  (가짜 시트, 구글 인증 불필요)
npm test                   # lib/diagnosis.js + API 단위 테스트 포함
```

### 4) 카피·문항 수정하기

대상별 랜딩 카피·축 훅 카피·문항·등급 기준·비교군 평균은 전부 `lib/diagnosis.js`의 `TARGETS`
객체 하나에 모여 있습니다. 프런트엔드는 `GET /api/diagnosis/config`로 이 값을 그대로 받아
렌더링하므로, 문구를 바꾸려면 이 파일만 고치면 됩니다(배포만 다시 하면 반영).

문제 진단: `https://<프로젝트이름>.vercel.app/api/diagnosis/health?key=<SETUP_SECRET>`

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

가장 먼저 진단 페이지를 열어보세요. 무엇이 막혔는지와 해결 방법을 그대로 보여줍니다.

```
https://<프로젝트이름>.vercel.app/api/survey/health?key=<SETUP_SECRET>
```

- 제출 시 `잠시 문제가 생겼어요` / `아직 접수 준비가 끝나지 않았어요` → 대부분 (1) 시트에 서비스 계정이 편집자로 공유되지 않았거나 (2) `GOOGLE_SERVICE_ACCOUNT_KEY`가 비어 있는 경우. 진단 페이지의 `fix` 항목대로 처리
- `SETUP_SECRET 환경변수를 먼저 설정하세요` → Vercel 환경변수 추가 후 재배포
- setup 응답에 `편집자로 공유되어 있는지 확인` → 시트에 서비스 계정 이메일을 편집자로 공유
- 제출이 계속 실패(잠시 문제가 생겼어요) → 시트 탭 이름이 `설문응답`, `챌린지링크`인지, 서비스 계정 권한이 편집자인지 확인
- 완료 화면에 단톡방 버튼이 안 뜸 → `챌린지링크` 탭의 링크가 채워져 있는지, 활성이 FALSE가 아닌지 확인
- `GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 없습니다` → Vercel 환경변수 등록 여부와 Production 체크 확인

홈페이지 진단 웹서비스가 막히면 `/api/diagnosis/health?key=<SETUP_SECRET>`를 여세요.
- `GOOGLE_DIAGNOSIS_SHEET_ID 환경변수가 없습니다` → 진단 리드용 구글시트를 새로 만들고 ID를 환경변수에 등록 (나다운타운 시트와 절대 겹치지 않게)
- 리드 제출 실패 → 그 시트에 서비스 계정이 편집자로 공유되어 있는지, 탭 이름이 `홈페이지진단리드`인지 확인
