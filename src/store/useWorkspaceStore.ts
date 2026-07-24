import { create } from 'zustand'
import {
  createProject as apiCreate,
  openProject as apiOpen,
  saveProjectData,
  type ProjectSummary,
} from '../lib/projects'
import type { PlannerData } from '../types'
import { defaultPlannerData, plannerSnapshot, usePlannerStore } from './usePlannerStore'
import { useToastStore } from './useToastStore'

/** 현재 열려 있는 프로젝트 요약 */
export interface CurrentProject {
  id: string
  name: string
  isMine: boolean
  updatedAt: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface WorkspaceState {
  view: 'landing' | 'project'
  current: CurrentProject | null
  /** 내 프로젝트가 아니면 읽기 전용 */
  readonly: boolean
  saveState: SaveState
  openProject: (summary: ProjectSummary, password?: string) => Promise<boolean>
  /** data 를 주면 그 내용으로(구버전 가져오기 등), 없으면 기본값으로 생성 */
  createProject: (name: string, password: string, data?: PlannerData) => Promise<void>
  backToLanding: () => void
  /** 대기 중인 저장을 즉시 반영 (탭 닫기·목록 이동 전) */
  flush: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** 현재 프로젝트 내용을 서버에 저장 */
  const persist = async () => {
    const cur = get().current
    if (!cur || get().readonly) return
    set({ saveState: 'saving' })
    try {
      await saveProjectData(cur.id, plannerSnapshot())
      set({ saveState: 'saved' })
    } catch (e) {
      // 재시도는 자동으로 걸지 않는다. 스토어에 내용은 남아 있으니 다음 편집 때 다시 저장된다.
      set({ saveState: 'error' })
      useToastStore.getState().show('저장에 실패했어요. 인터넷 연결을 확인해 주세요.')
      console.error('[save]', e)
    }
  }

  const scheduleSave = () => {
    if (get().readonly || !get().current) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 1200)
  }

  /** 편집 가능한 프로젝트를 열면 스토어 변경을 구독해 자동 저장 */
  const startAutosave = () => {
    stopAutosave()
    unsubscribe = usePlannerStore.subscribe(scheduleSave)
  }
  const stopAutosave = () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
  }

  return {
    view: 'landing',
    current: null,
    readonly: false,
    saveState: 'idle',

    openProject: async (summary, password) => {
      const opened = await apiOpen(summary.id, password)
      if (!opened) return false
      usePlannerStore.getState().loadProject(opened.data)
      set({
        view: 'project',
        current: { id: opened.id, name: opened.name, isMine: opened.is_mine, updatedAt: opened.updated_at },
        readonly: !opened.is_mine,
        saveState: 'idle',
      })
      if (opened.is_mine) startAutosave()
      else stopAutosave()
      return true
    },

    createProject: async (name, password, data) => {
      const payload = data ?? defaultPlannerData()
      const id = await apiCreate(name, password, payload)
      usePlannerStore.getState().loadProject(payload)
      set({
        view: 'project',
        current: { id, name, isMine: true, updatedAt: new Date().toISOString() },
        readonly: false,
        saveState: 'saved',
      })
      startAutosave()
    },

    backToLanding: () => {
      get().flush()
      stopAutosave()
      set({ view: 'landing', current: null, readonly: false, saveState: 'idle' })
    },

    flush: () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
        void persist()
      }
    },
  }
})

// 탭을 닫거나 새로고침하기 직전 대기 중인 저장을 밀어넣는다
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => useWorkspaceStore.getState().flush())
}
