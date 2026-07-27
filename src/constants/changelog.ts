export interface ChangelogEntry {
  version: string
  /** YYYY-MM-DD */
  date: string
  changes: string[]
}

/** 최신이 맨 앞. 업데이트할 때 이 배열 맨 앞에 항목을 추가한다. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.1.0',
    date: '2026-07-27',
    changes: [
      '내 프로젝트의 제목을 헤더에서 바로 수정할 수 있어요.',
      '프로젝트 상세에서 브라우저 뒤로가기 클릭 시 목록으로 돌아가요.',
    ],
  },
]

/** 현재 최신 업데이트 버전 (모달 표시 여부 판정 기준) */
export const LATEST_UPDATE = CHANGELOG[0]?.version ?? ''
