import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_ROLES, ROLE_PALETTES } from '../constants/roles'
import { fmt } from '../lib/workdays'
import type { HolidayConfig, RoleDef, RolePalette, Task } from '../types'

const STORAGE_KEY = 'milestone_planner_v3'
const LEGACY_STORAGE_KEY = 'milestone_planner_v2'

export interface PlannerState {
  startDate: string
  poolTasks: Task[]
  ganttTasks: Task[]
  roles: RoleDef[]
  holidays: HolidayConfig

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

/** 구버전(단일 HTML) localStorage 데이터를 새 포맷으로 변환 */
interface LegacyTask { id: number; name: string; [role: string]: unknown }
function readLegacyV2(): { startDate?: string; poolTasks: Task[]; ganttTasks: Task[] } | null {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return null
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const convert = (t: LegacyTask): Task => ({
      id: t.id,
      name: t.name || '',
      days: Object.fromEntries(
        DEFAULT_ROLES.map(r => [r.id, Number(t[r.id]) || 0]).filter(([, d]) => d),
      ),
    })
    return {
      startDate: typeof data.startDate === 'string' ? data.startDate : undefined,
      poolTasks: Array.isArray(data.poolTasks) ? data.poolTasks.map(convert) : [],
      ganttTasks: Array.isArray(data.ganttTasks) ? data.ganttTasks.map(convert) : [],
    }
  } catch {
    return null
  }
}

function initialData() {
  const legacy = readLegacyV2()
  return {
    startDate: legacy?.startDate ?? todayStr(),
    poolTasks: legacy?.poolTasks ?? emptyTasks(),
    ganttTasks: legacy?.ganttTasks ?? [],
    roles: DEFAULT_ROLES,
    holidays: { custom: [], disabled: [] } as HolidayConfig,
  }
}

const updateTask = (tasks: Task[], id: number, patch: (t: Task) => Task) =>
  tasks.map(t => (t.id === id ? patch(t) : t))

export const usePlannerStore = create<PlannerState>()(
  persist(
    set => ({
      ...initialData(),

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
      removeRole: id => set(s => ({
        roles: s.roles
          .filter(r => r.id !== id)
          .map(r => ({ ...r, dependsOn: r.dependsOn.filter(d => d !== id) })),
      })),
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

      // 휴무일 설정은 프로젝트와 무관한 회사 단위 정보라 초기화 대상에서 뺀다
      resetAll: () => {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        set({
          startDate: todayStr(),
          poolTasks: emptyTasks(),
          ganttTasks: [],
          roles: DEFAULT_ROLES,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      /**
       * v2: 기본 공휴일 목록에서 지난 연도가 빠지면서, 저장된 disabled에 남은
       * 매칭되지 않는 과거 날짜를 걸러낸다. custom은 사용자가 넣은 값이라 그대로 둔다.
       */
      migrate: (persisted, version) => {
        const state = persisted as PlannerState
        if (version >= 2 || !state?.holidays) return state
        const thisYear = new Date().getFullYear()
        return {
          ...state,
          holidays: {
            ...state.holidays,
            disabled: state.holidays.disabled.filter(d => Number(d.slice(0, 4)) >= thisYear),
          },
        }
      },
    },
  ),
)
