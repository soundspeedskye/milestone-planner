import { useMemo } from 'react'
import { calcSchedules } from './lib/schedule'
import { buildHolidaySet, makeIsWorkday, parseDate } from './lib/workdays'
import { usePlannerStore } from './store/usePlannerStore'

/** 휴무일 설정이 반영된 공휴일 Set + 영업일 판별 함수 */
export function useWorkdayContext() {
  const holidays = usePlannerStore(s => s.holidays)
  return useMemo(() => {
    const holidaySet = buildHolidaySet(holidays)
    return { holidaySet, isWD: makeIsWorkday(holidaySet) }
  }, [holidays])
}

/** 현재 간트 태스크들의 계산된 일정 */
export function useSchedules() {
  const ganttTasks = usePlannerStore(s => s.ganttTasks)
  const roles = usePlannerStore(s => s.roles)
  const startDate = usePlannerStore(s => s.startDate)
  const { isWD } = useWorkdayContext()
  return useMemo(() => {
    const projectStart = startDate ? parseDate(startDate) : new Date()
    return calcSchedules(ganttTasks, roles, projectStart, isWD)
  }, [ganttTasks, roles, startDate, isWD])
}
