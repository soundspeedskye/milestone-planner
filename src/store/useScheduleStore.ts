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
  schedules: TaskSchedule[]
  range: { min: Date; max: Date } | null
}

function derive(s: PlannerState): ScheduleState {
  const holidaySet = buildHolidaySet(s.holidays)
  const isWD = makeIsWorkday(holidaySet)
  const projectStart = s.startDate ? parseDate(s.startDate) : new Date()
  const schedules = calcSchedules(s.ganttTasks, s.roles, projectStart, isWD)
  return { holidaySet, isWD, schedules, range: scheduleRange(schedules) }
}

export const useScheduleStore = create<ScheduleState>(() => derive(usePlannerStore.getState()))

usePlannerStore.subscribe(state => useScheduleStore.setState(derive(state)))

/** 계산된 태스크 일정 */
export const useSchedules = () => useScheduleStore(s => s.schedules)
/** 전체 일정의 최소 시작일 / 최대 종료일 */
export const useScheduleRange = () => useScheduleStore(s => s.range)
/** 휴무일 설정이 반영된 공휴일 Set */
export const useHolidaySet = () => useScheduleStore(s => s.holidaySet)
/** 영업일 판별 함수 */
export const useIsWorkday = () => useScheduleStore(s => s.isWD)
