# 🗓 마일스톤 플래너

직군별 소요일 기반으로 프로젝트 일정을 자동 계산하는 마일스톤 플래너입니다.
단일 HTML 파일([legacy/milestone-planner-v2.html](legacy/milestone-planner-v2.html))에서 React + TypeScript + Vite 구조로 발전시켰습니다.

## 기능

- **태스크 보관함 ↔ 간트**: 태스크를 만들어 드래그로 일정에 추가하고, 순서를 바꾸거나 다시 꺼낼 수 있어요
- **자동 스케줄링**: 직군별 소요일을 입력하면 영업일(주말·공휴일 제외) 기준으로 순차 일정을 계산해요
- **직군 커스터마이즈**: 설정에서 직군 추가/삭제/이름·색상 변경, 직군 간 선후 관계("이후 시작") 설정
- **시작일 고정**: 특정 태스크를 지정한 날짜부터 시작하도록 고정 (앞 일정과 겹치면 ⚠️ 경고)
- **휴무일 관리**: 커스텀 휴무일 추가, 기본 공휴일(2025~2027) 개별 해제
- **뷰 2종**: 태스크별 간트 차트 / 직군별 타임라인(공백 표시)
- **저장·공유**: localStorage 자동 저장, JSON 내보내기, 회의록 Markdown 복사
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

## 배포

### Azure Static Web Apps (무료 티어)

1. GitHub에 저장소를 push
2. [Azure Portal](https://portal.azure.com) → **Static Web App 만들기** → 요금제 **Free** 선택
3. GitHub 저장소/브랜치(main) 연결, 빌드 설정:
   - App location: `/`
   - Output location: `dist`
4. Azure가 배포 토큰을 발급하면 GitHub 저장소 → Settings → Secrets에
   `AZURE_STATIC_WEB_APPS_API_TOKEN`으로 등록
5. 이후 main에 push할 때마다 [.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml)이 테스트 → 빌드 → 배포를 자동 실행

> Azure Portal에서 GitHub 연동으로 생성하면 워크플로 파일과 시크릿이 자동 등록됩니다.
> 이 저장소에는 미리 준비된 워크플로가 있으므로 시크릿만 등록하면 돼요.

### Vercel (대안)

Azure가 여의치 않으면 [vercel.com](https://vercel.com)에서 GitHub 저장소를 Import 하면 끝입니다.
Vite 프로젝트로 자동 감지되어 별도 설정이 필요 없습니다.
