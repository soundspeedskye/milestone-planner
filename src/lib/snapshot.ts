import type { RoleDef, Task, TaskSchedule } from '../types'
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
}

export function buildMilestoneSnapshot(args: {
  startDate: string
  schedules: TaskSchedule[]
  ganttTasks: Task[]
  poolTasks: Task[]
  roles: RoleDef[]
}): MilestoneSnapshot {
  const { startDate, schedules, ganttTasks, poolTasks, roles } = args
  const range = scheduleRange(schedules)
  const fixedById = new Map(ganttTasks.map(t => [t.id, t.fixedStart]))
  return {
    version: 2,
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
