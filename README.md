# content-research (1단계: 유튜브 파이프라인)

매일 아침 6시(KST)에 자동으로 실행되어, config 탭의 활성 키워드로
유튜브에서 "구독자 대비 조회수 배율이 높은" 최근 7일 영상을 찾아
contents 탭에 저장합니다.

## 파일 구조

```
api/cron/fetch-youtube.js   ← 크론이 매일 실행하는 함수
lib/sheets.js                ← 구글시트 읽기/쓰기 공용 함수
vercel.json                  ← 크론 스케줄 설정 (매일 06:00 KST)
package.json                 ← 의존성 (googleapis)
```

## 배포 후 수동 테스트 방법

배포가 끝나면 브라우저 주소창에 아래 URL을 입력해서 바로 실행해볼 수 있습니다
(크론 시간까지 기다릴 필요 없음):

```
https://<프로젝트이름>.vercel.app/api/cron/fetch-youtube
```

정상 동작하면 아래처럼 JSON 응답이 뜨고, 구글시트 contents 탭에
새 행이 쌓여있어야 합니다.

```json
{ "success": true, "keywordsChecked": 9, "rowsAdded": 12 }
```

## 문제가 생기면

- `YOUTUBE_API_KEY 환경변수가 없습니다` → Vercel 프로젝트 설정에서
  환경변수가 제대로 등록됐는지, Production 환경에 체크됐는지 확인
- `403` 또는 권한 에러 → 구글시트에 서비스 계정 이메일이
  편집자로 공유되어 있는지 확인
- `rowsAdded: 0` → 정상일 수 있음 (오늘 기준을 넘는 영상이 없었던 것).
  터짐 기준값(SCORE_THRESHOLD, fetch-youtube.js 내부)을 낮춰서 재시도 가능

## 다음 단계

이 코드는 "수집"만 합니다. Claude 분석(후킹 태깅 + 내 버전 기획안)과
대시보드는 2단계에서 추가됩니다.
