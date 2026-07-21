import type { HolidayConfig, RoleDef, Task, TaskSchedule } from '../types'
import { fmt } from './workdays'
import { scheduleRange } from './schedule'

export const EXPORT_FILE_NAME = 'milestone-current.json'

export interface MilestoneSnapshot {
  version: number
  source: string
  savedAt: string
  startDate: string
  projectEnd: string
  roles: { id: string; name: string; dependsOn: string[] }[]
  tasks: {
    id: number
    name: string
    fixedStart?: string
    roles: Record<string, { days: number; start: string; end: string }>
  }[]
  poolTasks: { id: number; name: string; days: Record<string, number> }[]
  /**
   * 일정 계산에서 빠진 날들. start/end에는 이미 반영돼 있고,
   * 나중에 파일만 보고 "왜 이 날이 비었는지" 알 수 있게 같이 남긴다.
   * 기본 공휴일은 앱이 자동으로 받아오므로 사용자가 조정한 값만 담는다.
   */
  holidays: {
    /** 사용자가 추가한 전사 휴무일 */
    custom: string[]
    /** 기본 공휴일 중 해제한 날 (그 날은 영업일로 계산됨) */
    disabled: string[]
    /** 직군 id → 그 직군만 쉬는 날 */
    byRole: Record<string, string[]>
  }
}

export function buildMilestoneSnapshot(args: {
  startDate: string
  schedules: TaskSchedule[]
  ganttTasks: Task[]
  poolTasks: Task[]
  roles: RoleDef[]
  holidays: HolidayConfig
}): MilestoneSnapshot {
  const { startDate, schedules, ganttTasks, poolTasks, roles, holidays } = args
  const range = scheduleRange(schedules)
  const fixedById = new Map(ganttTasks.map(t => [t.id, t.fixedStart]))
  return {
    version: 3,
    source: '마일스톤 플래너',
    savedAt: new Date().toISOString(),
    startDate,
    projectEnd: range ? fmt(range.max) : startDate,
    roles: roles.map(r => ({ id: r.id, name: r.name, dependsOn: r.dependsOn })),
    tasks: schedules.map(s => ({
      id: s.id,
      name: s.name,
      ...(fixedById.get(s.id) ? { fixedStart: fixedById.get(s.id) } : {}),
      roles: Object.fromEntries(
        Object.entries(s.roles).map(([roleId, info]) => [
          roleId,
          { days: info.days, start: fmt(info.start), end: fmt(info.end) },
        ]),
      ),
    })),
    poolTasks: poolTasks.map(t => ({ id: t.id, name: t.name, days: { ...t.days } })),
    holidays: {
      custom: [...holidays.custom],
      disabled: [...holidays.disabled],
      // 화면에서 지운 직군의 잔재가 남지 않도록 현재 직군 것만 담는다
      byRole: Object.fromEntries(
        roles
          .map(r => [r.id, holidays.byRole[r.id] ?? []] as const)
          .filter(([, dates]) => dates.length > 0)
          .map(([id, dates]) => [id, [...dates]]),
      ),
    },
  }
}

export function downloadJson(snapshot: MilestoneSnapshot): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  return saveBlob(blob)
}

async function saveBlob(blob: Blob): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const picker = (window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<{
      createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>
    }>
  }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: EXPORT_FILE_NAME,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'saved'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = EXPORT_FILE_NAME
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
