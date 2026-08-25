import { create } from 'zustand'
import { calcSchedules, scheduleRange } from '../lib/schedule'
import { buildHolidaySet, makeIsWorkday, parseDate, type IsWorkday } from '../lib/workdays'
import { usePlannerStore, type PlannerState } from './usePlannerStore'
import type { TaskSchedule } from '../types'

/**
 * 플래너 상태에서 파생되는 계산 결과를 담는 스토어.
 *
 * 컴포넌트마다 useMemo로 계산하면 같은 calcSchedules가 렌더당 여러 번 돈다.
 * 플래너 스토어를 한 번만 구독해 여기서 계산하고, 화면은 필요한 조각만 골라 쓴다.
 */
interface ScheduleState {
  holidaySet: Set<string>
  isWD: IsWorkday
  /** 직군 id → 그 직군만 쉬는 날(연차) Set. 일정 계산엔 영향 없고, 차트에서 세로 "연차" 표기에만 쓴다. */
  roleOffSet: Record<string, Set<string>>
  schedules: TaskSchedule[]
  range: { min: Date; max: Date } | null
}

function derive(s: PlannerState): ScheduleState {
  const holidaySet = buildHolidaySet(s.holidays)
  const isWD = makeIsWorkday(holidaySet)

  // 직군 휴무(연차)는 표기 전용이라 일정 계산에는 넣지 않는다.
  const roleOffSet: Record<string, Set<string>> = {}
  s.roles.forEach(r => {
    const dates = s.holidays.byRole[r.id]
    if (!dates?.length) return
    roleOffSet[r.id] = new Set(dates)
  })

  const projectStart = s.startDate ? parseDate(s.startDate) : new Date()
  const schedules = calcSchedules(s.ganttTasks, s.roles, projectStart, isWD)
  return { holidaySet, isWD, roleOffSet, schedules, range: scheduleRange(schedules) }
}

/**
 * 일정 계산에 실제로 영향을 주는 입력만 뽑은 시그니처.
 * 태스크 이름은 계산과 무관하므로 제외한다 → 이름만 바뀐 렌더에서는
 * derive 재실행·스토어 갱신을 건너뛰어 그리드 전체 리렌더를 막는다.
 * (직군 구성·의존 관계가 계산에 쓰이므로 roles 는 통째로 포함)
 */
function scheduleSignature(s: PlannerState): string {
  return JSON.stringify({
    startDate: s.startDate,
    holidays: s.holidays,
    roles: s.roles,
    gantt: s.ganttTasks.map(t => ({ id: t.id, days: t.days, fixedStart: t.fixedStart })),
  })
}

export const useScheduleStore = create<ScheduleState>(() => derive(usePlannerStore.getState()))

let lastSig = scheduleSignature(usePlannerStore.getState())
usePlannerStore.subscribe(state => {
  const sig = scheduleSignature(state)
  if (sig === lastSig) return
  lastSig = sig
  useScheduleStore.setState(derive(state))
})

/** 계산된 태스크 일정 */
export const useSchedules = () => useScheduleStore(s => s.schedules)
/** 전체 일정의 최소 시작일 / 최대 종료일 */
export const useScheduleRange = () => useScheduleStore(s => s.range)
/** 휴무일 설정이 반영된 공휴일 Set */
export const useHolidaySet = () => useScheduleStore(s => s.holidaySet)
/** 영업일 판별 함수 (전사 기준) */
export const useIsWorkday = () => useScheduleStore(s => s.isWD)
/** 직군 id → 그 직군만 쉬는 날(연차) Set */
export const useRoleOffSet = () => useScheduleStore(s => s.roleOffSet)
