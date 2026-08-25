# 🗓 마일스톤 플래너

직군별 소요일 기반으로 프로젝트 일정을 자동 계산하는 마일스톤 플래너입니다.
단일 HTML 파일([legacy/milestone-planner-v2.html](legacy/milestone-planner-v2.html))에서 React + TypeScript + Vite 구조로 발전시켰습니다.

> 👥 사용자용 안내는 [사용 설명서](docs/사용설명서.md)를 참고하세요. (회원가입·로그인 정책, 프로젝트 비밀번호 정책 등)

## 기능

- **태스크 보관함 ↔ 간트**: 태스크를 만들어 드래그로 일정에 추가하고, 순서를 바꾸거나 다시 꺼낼 수 있어요
- **자동 스케줄링**: 직군별 소요일을 입력하면 영업일(주말·공휴일 제외) 기준으로 순차 일정을 계산해요
- **직군 커스터마이즈**: 설정에서 직군 추가/삭제/이름·색상 변경, 직군 간 선후 관계("이후 시작") 설정
- **시작일 고정**: 특정 태스크를 지정한 날짜부터 시작하도록 고정. 고정한 태스크가 자리를 먼저 잡고, 나머지 태스크는 그 기간을 건너뛰고 이어서 진행돼요 (막대가 여러 토막으로 나뉠 수 있어요)
- **휴무일 관리**: 커스텀 휴무일 추가, 기본 공휴일 개별 해제
- **직군별 휴무일**: 특정 직군만 쉬는 날을 지정하면 그 직군의 소요일 계산에서만 빠져요 (차트에서 해당 줄만 별도 표시)
- **공휴일 자동 갱신**: data.go.kr 특일정보 API 기반으로 매달 공휴일(임시공휴일 포함)을 자동 반영
- **뷰 2종**: 태스크별 간트 차트 / 직군별 타임라인(공백 표시)
- **로그인·프로젝트**: `@safience.com` 계정으로 로그인, 프로젝트를 여러 개 만들어 서버(Supabase)에 저장
- **접근 제어**: 목록은 모든 회원에게 보이고, 남의 프로젝트는 프로젝트 비밀번호를 입력해야 **읽기 전용**으로 열림. `super-tester@safience.com` 슈퍼관리자는 모든 프로젝트를 비밀번호 없이 열고 **편집**까지 가능(자동 저장·버전 저장 포함). 삭제와 비밀번호 변경은 생성자만
- **저장·공유**: 편집 내용은 서버에 자동 저장(debounce), JSON 내보내기(휴무일 설정 포함), 회의록 Markdown 복사

## 개발

```bash
npm install
cp .env.example .env.local   # Supabase URL·anon key 채우기
npm run dev        # 개발 서버 (http://localhost:5173)
npm test           # 단위 테스트 (영업일 계산·스케줄 엔진)
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기
```

## Supabase 설정

로그인·프로젝트 저장은 [Supabase](https://supabase.com) 무료 티어를 씁니다.

1. Supabase 프로젝트 생성 후 **Authentication → Providers → Email** 에서 _Confirm email_ 을 **OFF**
2. **SQL Editor** 에 [supabase/schema.sql](supabase/schema.sql) 전체를 붙여넣고 실행
   (프로필·프로젝트 테이블, RLS, `@safience.com` 도메인 제한, 열람/생성 RPC가 만들어집니다)
3. **SQL Editor** 에 [supabase/migrations](supabase/migrations) 의 파일들을 이름 순서대로 실행
   (버전 관리 테이블, 슈퍼관리자 편집 권한 등 스키마 이후에 추가된 변경입니다)
4. **Project Settings → API** 에서 `URL` 과 `anon public` 키를 복사해 `.env.local` 에 입력

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...   # anon public 키 또는 sb_publishable_... 키
```

> 키는 기존 `anon public`(`eyJ...`) 키와 새 형식 `publishable`(`sb_publishable_...`) 키 모두 사용할 수 있어요.

> 접근 모델: 앱 진입은 `@safience.com` 로그인 필수 · 프로젝트 목록은 전 회원 공개(내용 제외) ·
> 열람은 owner 또는 슈퍼관리자는 바로/그 외는 프로젝트 비밀번호 · 편집은 owner·슈퍼관리자 ·
> 삭제와 비밀번호 변경은 owner 만.
> `data`(내용)는 RLS 로 테이블 직접 조회를 막고 `open_project` RPC(비번 대조)로만 나갑니다.

## 구조

```
src/
├── types.ts               # 도메인 타입 (Task, RoleDef, TaskSchedule …)
├── constants/             # 기본 공휴일, 직군 프리셋
├── lib/
│   ├── workdays.ts        # 영업일 계산 (addWD, countWD)
│   ├── schedule.ts        # 스케줄 엔진 (직군 의존 체인 기반)
│   ├── snapshot.ts        # JSON 내보내기
│   ├── markdown.ts        # 회의록 Markdown 생성
│   ├── supabase.ts        # Supabase 클라이언트
│   ├── projects.ts        # 프로젝트 목록/열람/생성/저장 API (RPC·RLS)
│   └── legacyImport.ts    # 구버전 localStorage 데이터 가져오기
├── store/                 # Zustand 스토어 (auth / workspace / planner …)
└── components/            # auth(랜딩·로그인·카드) / TopBar / sidebar / gantt / settings
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
5. 같은 Secrets에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`도 등록
   (Vite가 빌드 타임에 값을 넣으므로 없으면 배포본에서 로그인이 동작하지 않습니다)
6. 이후 main에 push할 때마다 [.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml)이 테스트 → 빌드 → 배포를 자동 실행

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
