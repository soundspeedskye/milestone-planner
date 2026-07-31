import { create } from 'zustand'
import {
  createProject as apiCreate,
  openProject as apiOpen,
  renameProject as apiRename,
  saveProjectData,
  type ProjectSummary,
} from '../lib/projects'
import { createVersion, getVersion, type VersionSummary } from '../lib/versions'
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

/** 미리보기 중인 버전 정보 (편집 잠금 배너에 쓴다) */
export interface PreviewInfo {
  id: string
  label: string
  createdAt: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface WorkspaceState {
  view: 'landing' | 'project'
  current: CurrentProject | null
  /** 내 프로젝트가 아니거나 버전 미리보기 중이면 읽기 전용 */
  readonly: boolean
  saveState: SaveState
  /** 버전을 열 때 쓴 비번(메모리 전용). 비번 열람자가 버전 RPC를 호출할 때 넘긴다 */
  openPassword: string | null
  /** null 이 아니면 옛 버전을 미리보기 중 */
  preview: PreviewInfo | null
  openProject: (summary: ProjectSummary, password?: string) => Promise<boolean>
  /** data 를 주면 그 내용으로(구버전 가져오기 등), 없으면 기본값으로 생성 */
  createProject: (name: string, password: string, data?: PlannerData) => Promise<void>
  /** 현재 프로젝트 제목 변경 (owner 만) */
  renameCurrent: (name: string) => Promise<void>
  /** 현재 상태를 새 버전으로 저장 (owner 만) */
  saveVersion: (label: string, note: string) => Promise<VersionSummary | null>
  /** 옛 버전을 읽기 전용으로 화면에 로드 (자동저장 중단, 현재 상태는 백업) */
  previewVersion: (v: PreviewInfo) => Promise<void>
  /** 미리보기를 끝내고 백업한 현재 상태로 복귀 */
  exitPreview: () => void
  /** 옛 버전을 현재 내용으로 되돌린다 (복원 직전 상태는 자동 버전으로 남긴다) */
  restoreVersion: (v: PreviewInfo) => Promise<void>
  backToLanding: () => void
  /** 대기 중인 저장을 즉시 반영 (탭 닫기·목록 이동 전) */
  flush: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null
/** 미리보기 진입 전 라이브 내용 백업 (미리보기/복원에서 되돌릴 때 쓴다) */
let liveBackup: PlannerData | null = null

/** 프로젝트를 열 때 히스토리 항목을 하나 쌓아, 브라우저 뒤로가기로 목록에 돌아올 수 있게 한다 */
const pushProjectHistory = () => {
  if (typeof window !== 'undefined') window.history.pushState({ mp: 'project' }, '')
}

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
    openPassword: null,
    preview: null,

    openProject: async (summary, password) => {
      const opened = await apiOpen(summary.id, password)
      if (!opened) return false
      usePlannerStore.getState().loadProject(opened.data)
      set({
        view: 'project',
        current: { id: opened.id, name: opened.name, isMine: opened.is_mine, updatedAt: opened.updated_at },
        readonly: !opened.is_mine,
        saveState: 'idle',
        openPassword: password ?? null,
        preview: null,
      })
      if (opened.is_mine) startAutosave()
      else stopAutosave()
      pushProjectHistory()
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
        openPassword: password ?? null,
        preview: null,
      })
      startAutosave()
      pushProjectHistory()
    },

    renameCurrent: async name => {
      const cur = get().current
      if (!cur || get().readonly) return
      const trimmed = name.trim()
      if (!trimmed || trimmed === cur.name) return
      try {
        await apiRename(cur.id, trimmed)
        set({ current: { ...cur, name: trimmed } })
        useToastStore.getState().show('제목을 바꿨어요 ✓')
      } catch (e) {
        useToastStore.getState().show('제목을 바꾸지 못했어요.')
        console.error('[rename]', e)
      }
    },

    saveVersion: async (label, note) => {
      const cur = get().current
      if (!cur || get().readonly) return null
      try {
        // 대기 중인 자동저장을 먼저 밀어넣어 라이브와 버전이 어긋나지 않게 한다
        get().flush()
        const summary = await createVersion(cur.id, label, note, plannerSnapshot())
        useToastStore.getState().show(`버전 '${summary.label}'을 저장했어요 ✓`)
        return summary
      } catch (e) {
        useToastStore.getState().show('버전을 저장하지 못했어요.')
        console.error('[saveVersion]', e)
        return null
      }
    },

    previewVersion: async v => {
      if (get().preview) return // 이미 미리보기 중이면 무시
      const data = await getVersion(v.id, get().openPassword ?? undefined)
      if (!data) {
        useToastStore.getState().show('버전을 불러오지 못했어요.')
        return
      }
      // 대기 중인 저장을 밀어넣고 자동저장을 멈춘 뒤, 라이브를 백업하고 버전을 로드한다.
      get().flush()
      stopAutosave()
      liveBackup = plannerSnapshot()
      usePlannerStore.getState().loadProject(data)
      set({ preview: v, readonly: true })
    },

    exitPreview: () => {
      if (!get().preview) return
      if (liveBackup) usePlannerStore.getState().loadProject(liveBackup)
      liveBackup = null
      const mine = get().current?.isMine ?? false
      set({ preview: null, readonly: !mine })
      if (mine) startAutosave()
    },

    restoreVersion: async v => {
      const cur = get().current
      if (!cur || !cur.isMine) return
      const target = await getVersion(v.id, get().openPassword ?? undefined)
      if (!target) {
        useToastStore.getState().show('버전을 불러오지 못했어요.')
        return
      }
      // 복원 직전의 라이브 상태를 자동 버전으로 남겨 되돌릴 수 있게 한다.
      const liveNow = get().preview ? liveBackup : plannerSnapshot()
      if (liveNow) {
        try {
          await createVersion(cur.id, '', `${v.label} 복원 직전 자동 저장`, liveNow)
        } catch (e) {
          console.error('[restoreVersion:autobackup]', e)
        }
      }
      liveBackup = null
      // 구독을 먼저 켠 뒤 로드해야 그 변경이 자동저장으로 잡힌다. 그 후 즉시 밀어넣는다.
      set({ preview: null, readonly: false })
      startAutosave()
      usePlannerStore.getState().loadProject(target)
      get().flush()
      useToastStore.getState().show(`'${v.label}' 버전으로 복원했어요 ✓`)
    },

    backToLanding: () => {
      get().flush()
      stopAutosave()
      liveBackup = null
      set({ view: 'landing', current: null, readonly: false, saveState: 'idle', openPassword: null, preview: null })
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

// 페이지를 떠나기 직전 대기 중인 저장을 밀어넣는다.
// beforeunload 는 async fetch 완료를 보장하지 않으므로,
// 페이지가 아직 살아 있는 visibilitychange(hidden) 시점에 저장한다.
if (typeof window !== 'undefined') {
  const flushPending = () => useWorkspaceStore.getState().flush()
  // 탭 전환·앱 전환·탭 닫기 등 대부분의 이탈에서 가장 먼저,
  // 그리고 페이지가 아직 살아 있을 때 발생한다 → 저장 fetch 가 완료될 시간이 있다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending()
  })
  // beforeunload 가 뜨지 않는 모바일 사파리 등을 위한 백업
  window.addEventListener('pagehide', flushPending)

  // 프로젝트 상세에서 브라우저 뒤로가기를 누르면 목록으로 돌아간다.
  // (열 때 쌓은 히스토리 항목이 popstate 로 빠지는 시점)
  window.addEventListener('popstate', () => {
    const st = useWorkspaceStore.getState()
    if (st.view === 'project') st.backToLanding()
  })
}
