# 🗓 마일스톤 플래너

직군별 소요일 기반으로 프로젝트 일정을 자동 계산하는 마일스톤 플래너입니다.
단일 HTML 파일([legacy/milestone-planner-v2.html](legacy/milestone-planner-v2.html))에서 React + TypeScript + Vite 구조로 발전시켰습니다.

## 기능

- **태스크 보관함 ↔ 간트**: 태스크를 만들어 드래그로 일정에 추가하고, 순서를 바꾸거나 다시 꺼낼 수 있어요
- **자동 스케줄링**: 직군별 소요일을 입력하면 영업일(주말·공휴일 제외) 기준으로 순차 일정을 계산해요
- **직군 커스터마이즈**: 설정에서 직군 추가/삭제/이름·색상 변경, 직군 간 선후 관계("이후 시작") 설정
- **시작일 고정**: 특정 태스크를 지정한 날짜부터 시작하도록 고정 (앞 일정과 겹치면 ⚠️ 경고)
- **휴무일 관리**: 커스텀 휴무일 추가, 기본 공휴일 개별 해제
- **직군별 휴무일**: 특정 직군만 쉬는 날을 지정하면 그 직군의 소요일 계산에서만 빠져요 (차트에서 해당 줄만 별도 표시)
- **공휴일 자동 갱신**: data.go.kr 특일정보 API 기반으로 매달 공휴일(임시공휴일 포함)을 자동 반영
- **뷰 2종**: 태스크별 간트 차트 / 직군별 타임라인(공백 표시)
- **저장·공유**: localStorage 자동 저장, JSON 내보내기(휴무일 설정 포함), 회의록 Markdown 복사
- 구버전(단일 HTML) localStorage 데이터는 첫 실행 시 자동 마이그레이션됩니다

## 개발

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm test           # 단위 테스트 (영업일 계산·스케줄 엔진)
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
```

## 구조

```
src/
├── types.ts               # 도메인 타입 (Task, RoleDef, TaskSchedule …)
├── constants/             # 기본 공휴일, 직군 프리셋
├── lib/
│   ├── workdays.ts        # 영업일 계산 (addWD, countWD)
│   ├── schedule.ts        # 스케줄 엔진 (직군 의존 체인 기반)
│   ├── snapshot.ts        # JSON 내보내기
│   └── markdown.ts        # 회의록 Markdown 생성
├── store/                 # Zustand 스토어 (persist → localStorage)
└── components/            # TopBar / sidebar / gantt / settings
```

스케줄 규칙: 각 직군은 ①자기 직군의 직전 태스크가 끝난 뒤, ②같은 태스크 안에서 "이후 시작"으로
지정된 직군이 끝난 뒤 시작합니다. 기본 구성은 기획 → PD·BE → FE(PD 이후) 순서입니다.
소요일은 주말·공휴일·전사 휴무일을 뺀 영업일로 세고, 직군별 휴무일이 있으면 그 직군만 추가로 제외합니다.

## 배포

### Azure Static Web Apps (무료 티어)

1. GitHub에 저장소를 push
2. [Azure Portal](https://portal.azure.com) → **Static Web App 만들기** → 요금제 **Free** 선택
3. 배포 소스는 **기타(Other)** 선택 (GitHub을 고르면 Azure가 워크플로를 하나 더 만들어 중복 실행됨)
4. 생성 후 **배포 토큰 관리**에서 토큰 복사 → GitHub 저장소 → Settings → Secrets에
   `AZURE_STATIC_WEB_APPS_API_TOKEN`으로 등록
5. 이후 main에 push할 때마다 [.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml)이 테스트 → 빌드 → 배포를 자동 실행

> 워크플로가 `npm run build`로 직접 빌드하고 `skip_app_build: true`로 올리므로,
> `app_location`은 빌드 결과물인 `dist`를 가리킵니다. `/`로 두면 소스 전체가 배포됩니다.
> 같은 이유로 `staticwebapp.config.json`은 `dist`에 포함되도록 [public/](public/)에 둡니다.

### 공휴일 자동 갱신 (data.go.kr)

공휴일 목록([src/constants/holidays.generated.ts](src/constants/holidays.generated.ts))은
[.github/workflows/update-holidays.yml](.github/workflows/update-holidays.yml)이 **매월 1일** 공공데이터포털
특일정보 API로 재생성하고, 변경이 있으면 커밋 후 재배포합니다. 브라우저가 아닌 CI에서 호출하므로
API 키가 노출되지 않고, CORS 문제도 없습니다.

설정 방법:

1. [공공데이터포털](https://www.data.go.kr) 회원가입 → **"특일 정보"** API 활용 신청 (무료, 즉시 승인)
2. 마이페이지에서 **일반 인증키(Decoding)** 복사
3. GitHub 저장소 → Settings → Secrets → `DATA_GO_KR_SERVICE_KEY`로 등록
4. 수동 실행: Actions 탭에서 "Update holidays" → Run workflow, 로컬에서는
   `DATA_GO_KR_SERVICE_KEY=<키> npm run fetch:holidays`

키를 등록하기 전까지는 저장소에 들어있는 목록(2025~2027)이 그대로 사용됩니다.

### Vercel (대안)

Azure가 여의치 않으면 [vercel.com](https://vercel.com)에서 GitHub 저장소를 Import 하면 끝입니다.
Vite 프로젝트로 자동 감지되어 별도 설정이 필요 없습니다.
