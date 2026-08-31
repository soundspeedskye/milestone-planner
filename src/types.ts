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
  /** 첫 작업일 */
  start: Date
  /** 마지막 작업일 */
  end: Date
  /** 실제로 일하는 영업일 수. start~end 안의 주말·공휴일은 빠진다 */
  days: number
}

export interface TaskSchedule {
  id: number
  roles: Record<string, RoleSchedule>
}

export interface HolidayConfig {
  /** 사용자가 추가한 휴무일 (YYYY-MM-DD) */
  custom: string[]
  /** 기본 공휴일 중 사용자가 해제한 날짜 */
  disabled: string[]
  /** 직군 id → 그 직군만 쉬는 날(연차, YYYY-MM-DD). 일정 계산에는 영향이 없고 차트에 세로 "연차"로만 표기된다 */
  byRole: Record<string, string[]>
}

/** 프로젝트 하나에 저장되는 플래너 상태 전체 (projects.data jsonb) */
export interface PlannerData {
  startDate: string
  poolTasks: Task[]
  ganttTasks: Task[]
  roles: RoleDef[]
  holidays: HolidayConfig
}
