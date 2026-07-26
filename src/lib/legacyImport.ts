import { DEFAULT_ROLES } from '../constants/roles'
import type { PlannerData, Task } from '../types'

// 구버전(로그인·DB 없던 시절)이 localStorage 에 저장하던 zustand persist 키
const LEGACY_KEY = 'milestone_planner_v3'
// 가져오기/무시를 한 번이라도 했으면 다시 배너를 띄우지 않기 위한 플래그
const IMPORTED_FLAG = 'milestone_planner_imported'

const todayStr = () => new Date().toISOString().slice(0, 10)

const hasContent = (poolTasks: Task[], ganttTasks: Task[], customHolidays: string[]) =>
  ganttTasks.length > 0 ||
  poolTasks.some(t => t.name?.trim() || Object.keys(t.days ?? {}).length > 0) ||
  customHolidays.length > 0

/**
 * localStorage 의 구버전 저장분을 PlannerData 로 파싱한다.
 * 빈 기본값(이름 없는 태스크만 있는 상태)은 가져올 의미가 없어 null 을 반환한다.
 */
function parseLegacy(): PlannerData | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // zustand persist 는 { state, version } 형태로 저장한다
    const s = parsed?.state ?? parsed
    if (!s || typeof s !== 'object') return null

    const poolTasks: Task[] = Array.isArray(s.poolTasks) ? s.poolTasks : []
    const ganttTasks: Task[] = Array.isArray(s.ganttTasks) ? s.ganttTasks : []
    const holidays = s.holidays && typeof s.holidays === 'object' ? s.holidays : {}
    const custom: string[] = Array.isArray(holidays.custom) ? holidays.custom : []

    if (!hasContent(poolTasks, ganttTasks, custom)) return null

    return {
      startDate: typeof s.startDate === 'string' ? s.startDate : todayStr(),
      poolTasks,
      ganttTasks,
      roles: Array.isArray(s.roles) && s.roles.length ? s.roles : DEFAULT_ROLES,
      holidays: {
        custom,
        disabled: Array.isArray(holidays.disabled) ? holidays.disabled : [],
        byRole: holidays.byRole && typeof holidays.byRole === 'object' ? holidays.byRole : {},
      },
    }
  } catch {
    return null
  }
}

/** 이 브라우저에 가져올 만한 구버전 데이터가 있고, 아직 가져오기/무시를 안 했는가 */
export function hasLegacyData(): boolean {
  if (localStorage.getItem(IMPORTED_FLAG)) return false
  return parseLegacy() !== null
}

/** 배너의 "가져오기"에서 쓸 실제 데이터 */
export function getLegacyData(): PlannerData | null {
  return parseLegacy()
}

/** 가져오기 완료 또는 무시. 원본은 백업 삼아 지우지 않고 플래그만 남긴다 */
export function markLegacyImported(): void {
  localStorage.setItem(IMPORTED_FLAG, '1')
}
