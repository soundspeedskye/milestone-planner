import { create } from 'zustand'
import { DEFAULT_ROLES, ROLE_PALETTES } from '../constants/roles'
import { fmt } from '../lib/workdays'
import type { HolidayConfig, PlannerData, RoleDef, RolePalette, Task } from '../types'

export interface PlannerState {
  startDate: string
  poolTasks: Task[]
  ganttTasks: Task[]
  roles: RoleDef[]
  holidays: HolidayConfig

  /** 프로젝트 내용을 스토어에 주입 (열람/전환 시) */
  loadProject: (data: PlannerData) => void

  setStartDate: (v: string) => void
  addPoolTask: () => void
  removePoolTask: (id: number) => void
  updateTaskName: (id: number, name: string) => void
  updateTaskDays: (id: number, roleId: string, days: number) => void
  moveToGantt: (id: number) => void
  ejectFromGantt: (id: number) => void
  reorderGantt: (from: number, to: number) => void
  setFixedStart: (id: number, date: string | undefined) => void

  addRole: () => void
  removeRole: (id: string) => void
  renameRole: (id: string, name: string) => void
  setRolePalette: (id: string, palette: RolePalette) => void
  toggleRoleDep: (id: string, depId: string) => void
  moveRole: (id: string, dir: -1 | 1) => void

  addCustomHoliday: (d: string) => void
  removeCustomHoliday: (d: string) => void
  toggleDefaultHoliday: (d: string) => void
  addRoleHoliday: (roleId: string, d: string) => void
  removeRoleHoliday: (roleId: string, d: string) => void

  resetAll: () => void
}

const todayStr = () => {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return fmt(t)
}

const newTaskId = (state: { poolTasks: Task[]; ganttTasks: Task[] }) =>
  Math.max(0, ...state.poolTasks.map(t => t.id), ...state.ganttTasks.map(t => t.id)) + 1

const emptyTask = (id: number): Task => ({ id, name: '', days: {} })
/** 처음 열었을 때와 초기화했을 때 같은 개수로 시작한다 */
const emptyTasks = () => [emptyTask(1), emptyTask(2), emptyTask(3)]

/** 새 프로젝트의 기본 내용 */
export function defaultPlannerData(): PlannerData {
  return {
    startDate: todayStr(),
    poolTasks: emptyTasks(),
    ganttTasks: [],
    roles: DEFAULT_ROLES,
    holidays: { custom: [], disabled: [], byRole: {} },
  }
}

/** 현재 스토어 상태를 저장용 스냅샷으로 뽑아낸다 */
export function plannerSnapshot(): PlannerData {
  const { startDate, poolTasks, ganttTasks, roles, holidays } = usePlannerStore.getState()
  return { startDate, poolTasks, ganttTasks, roles, holidays }
}

const updateTask = (tasks: Task[], id: number, patch: (t: Task) => Task) =>
  tasks.map(t => (t.id === id ? patch(t) : t))

export const usePlannerStore = create<PlannerState>()(
    set => ({
      ...defaultPlannerData(),

      loadProject: data => set({
        startDate: data.startDate ?? todayStr(),
        poolTasks: data.poolTasks ?? emptyTasks(),
        ganttTasks: data.ganttTasks ?? [],
        roles: data.roles ?? DEFAULT_ROLES,
        holidays: {
          custom: data.holidays?.custom ?? [],
          disabled: data.holidays?.disabled ?? [],
          byRole: data.holidays?.byRole ?? {},
        },
      }),

      setStartDate: v => set({ startDate: v }),

      addPoolTask: () => set(s => ({ poolTasks: [...s.poolTasks, emptyTask(newTaskId(s))] })),
      removePoolTask: id => set(s => ({ poolTasks: s.poolTasks.filter(t => t.id !== id) })),
      updateTaskName: (id, name) => set(s => ({
        poolTasks: updateTask(s.poolTasks, id, t => ({ ...t, name })),
        ganttTasks: updateTask(s.ganttTasks, id, t => ({ ...t, name })),
      })),
      updateTaskDays: (id, roleId, days) => set(s => ({
        poolTasks: updateTask(s.poolTasks, id, t => ({ ...t, days: { ...t.days, [roleId]: days } })),
        ganttTasks: updateTask(s.ganttTasks, id, t => ({ ...t, days: { ...t.days, [roleId]: days } })),
      })),

      moveToGantt: id => set(s => {
        const task = s.poolTasks.find(t => t.id === id)
        if (!task) return s
        return { poolTasks: s.poolTasks.filter(t => t.id !== id), ganttTasks: [...s.ganttTasks, task] }
      }),
      ejectFromGantt: id => set(s => {
        const task = s.ganttTasks.find(t => t.id === id)
        if (!task) return s
        const { fixedStart: _drop, ...rest } = task
        return { ganttTasks: s.ganttTasks.filter(t => t.id !== id), poolTasks: [...s.poolTasks, rest] }
      }),
      reorderGantt: (from, to) => set(s => {
        const list = [...s.ganttTasks]
        const [moved] = list.splice(from, 1)
        list.splice(to, 0, moved)
        return { ganttTasks: list }
      }),
      setFixedStart: (id, date) => set(s => ({
        ganttTasks: updateTask(s.ganttTasks, id, t => {
          const { fixedStart: _drop, ...rest } = t
          return date ? { ...rest, fixedStart: date } : rest
        }),
      })),

      addRole: () => set(s => {
        const id = `role_${Date.now()}`
        const palette = ROLE_PALETTES[s.roles.length % ROLE_PALETTES.length]
        return { roles: [...s.roles, { id, name: `직군 ${s.roles.length + 1}`, palette, dependsOn: [] }] }
      }),
      // 직군이 사라지면 그 직군에만 걸어둔 휴무일도 같이 정리한다
      removeRole: id => set(s => {
        const { [id]: _dropped, ...byRole } = s.holidays.byRole
        return {
          roles: s.roles
            .filter(r => r.id !== id)
            .map(r => ({ ...r, dependsOn: r.dependsOn.filter(d => d !== id) })),
          holidays: { ...s.holidays, byRole },
        }
      }),
      renameRole: (id, name) => set(s => ({
        roles: s.roles.map(r => (r.id === id ? { ...r, name } : r)),
      })),
      setRolePalette: (id, palette) => set(s => ({
        roles: s.roles.map(r => (r.id === id ? { ...r, palette } : r)),
      })),
      toggleRoleDep: (id, depId) => set(s => ({
        roles: s.roles.map(r => {
          if (r.id !== id) return r
          const has = r.dependsOn.includes(depId)
          return { ...r, dependsOn: has ? r.dependsOn.filter(d => d !== depId) : [...r.dependsOn, depId] }
        }),
      })),
      moveRole: (id, dir) => set(s => {
        const idx = s.roles.findIndex(r => r.id === id)
        const to = idx + dir
        if (idx < 0 || to < 0 || to >= s.roles.length) return s
        const roles = [...s.roles]
        ;[roles[idx], roles[to]] = [roles[to], roles[idx]]
        return { roles }
      }),

      addCustomHoliday: d => set(s => (
        s.holidays.custom.includes(d) ? s : { holidays: { ...s.holidays, custom: [...s.holidays.custom, d].sort() } }
      )),
      removeCustomHoliday: d => set(s => ({
        holidays: { ...s.holidays, custom: s.holidays.custom.filter(x => x !== d) },
      })),
      toggleDefaultHoliday: d => set(s => {
        const has = s.holidays.disabled.includes(d)
        return {
          holidays: {
            ...s.holidays,
            disabled: has ? s.holidays.disabled.filter(x => x !== d) : [...s.holidays.disabled, d].sort(),
          },
        }
      }),

      addRoleHoliday: (roleId, d) => set(s => {
        const cur = s.holidays.byRole[roleId] ?? []
        if (cur.includes(d)) return s
        return { holidays: { ...s.holidays, byRole: { ...s.holidays.byRole, [roleId]: [...cur, d].sort() } } }
      }),
      removeRoleHoliday: (roleId, d) => set(s => {
        const cur = s.holidays.byRole[roleId] ?? []
        const next = cur.filter(x => x !== d)
        const byRole = { ...s.holidays.byRole }
        // 빈 배열을 남기면 저장 데이터에 쓸모없는 키가 쌓인다
        if (next.length) byRole[roleId] = next
        else delete byRole[roleId]
        return { holidays: { ...s.holidays, byRole } }
      }),

      // 태스크·직군만 비우고 휴무일 설정은 유지한다
      resetAll: () => set({
        startDate: todayStr(),
        poolTasks: emptyTasks(),
        ganttTasks: [],
        roles: DEFAULT_ROLES,
      }),
    }),
)
