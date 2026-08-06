export interface ChangelogEntry {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  changes: string[];
}

/** 최신이 맨 앞. 업데이트할 때 이 배열 맨 앞에 항목을 추가한다. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.3.0",
    date: "2026-08-06",
    changes: [
      "간트에서 직군 휴무 표기식이 변경됐습니다.",
      "직군 휴무(연차)는 이제 일정에 영향을 주지 않습니다.",
    ],
  },
  {
    version: "3.2.0",
    date: "2026-07-31",
    changes: [
      "현재 프로젝트를 버전으로 관리할 수 있고, 예전 버전을 미리보거나 그 시점으로 되돌릴 수 있어요.",
      "간트에 올린 태스크도 바로 수정할 수 있어요.",
      "간트의 UI가 전반적으로 개선되었어요.",
      "보관함의 태스크를 간트에 추가 시 시작일이 자동으로 설정돼요.",
    ],
  },
  {
    version: "3.1.1",
    date: "2026-07-29",
    changes: [
      "프로젝트 상세 간트에서 가로로 이동해도 태스크와 직군 컬럼이 고정돼요.",
      "내 프로젝트에서 태스크 보관함과 일정 영역을 각각 독립적으로 스크롤할 수 있어요.",
    ],
  },
  {
    version: "3.1.0",
    date: "2026-07-27",
    changes: [
      "내 프로젝트의 제목을 헤더에서 바로 수정할 수 있어요.",
      "프로젝트 상세에서 브라우저 뒤로가기 클릭 시 목록으로 돌아가요.",
    ],
  },
];

/** 현재 최신 업데이트 버전 (모달 표시 여부 판정 기준) */
export const LATEST_UPDATE = CHANGELOG[0]?.version ?? "";
