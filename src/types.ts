/** 직군 색상 팔레트 (간트 바 / 뱃지 / 라벨) */
export interface RolePalette {
  header: string
  bar: string
  barText: string
  badgeBg: string
  badgeText: string
}

/** 직군 정의. dependsOn: 같은 태스크 안에서 이 직군이 기다려야 하는 직군 id 목록 */
export interface RoleDef {
  id: string
  name: string
  palette: RolePalette
  dependsOn: string[]
}

/** 태스크. days: 직군 id → 소요 영업일 */
export interface Task {
  id: number
  name: string
  days: Record<string, number>
  /** YYYY-MM-DD. 설정 시 순차 계산 대신 이 날짜부터 시작 */
  fixedStart?: string
}

export interface RoleSchedule {
  start: Date
  end: Date
  days: number
}

export interface TaskSchedule {
  id: number
  name: string
  roles: Record<string, RoleSchedule>
  /** 시작일 고정으로 같은 직군의 앞 일정과 겹칠 때 경고 메시지 */
  warnings: string[]
}

export interface HolidayConfig {
  /** 사용자가 추가한 휴무일 (YYYY-MM-DD) */
  custom: string[]
  /** 기본 공휴일 중 사용자가 해제한 날짜 */
  disabled: string[]
}
