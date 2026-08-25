import { create } from 'zustand'
import {
  createProject as apiCreate,
  isSlugTaken,
  listProjects,
  openProject as apiOpen,
  saveProjectData,
  updateProjectMeta,
  type ProjectSummary,
} from '../lib/projects'
import { LANDING_PATH, parseRoute, projectPath, type ProjectRef } from '../lib/route'
import { createVersion, getVersion, type VersionSummary } from '../lib/versions'
import type { PlannerData } from '../types'
import { defaultPlannerData, plannerSnapshot, usePlannerStore } from './usePlannerStore'
import { useToastStore } from './useToastStore'

/** 현재 열려 있는 프로젝트 요약 */
export interface CurrentProject {
  id: string
  name: string
  /** 지정한 주소. null 이면 /p/<uuid> 로 연다 */
  slug: string | null
  isMine: boolean
  /** owner 이거나 슈퍼관리자라서 편집할 수 있는지 (슈퍼관리자는 isMine=false, canEdit=true) */
  canEdit: boolean
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
  /** 편집 권한이 없거나(비번 열람자) 버전 미리보기 중이면 읽기 전용 */
  readonly: boolean
  saveState: SaveState
  /** 버전을 열 때 쓴 비번(메모리 전용). 비번 열람자가 버전 RPC를 호출할 때 넘긴다 */
  openPassword: string | null
  /** null 이 아니면 옛 버전을 미리보기 중 */
  preview: PreviewInfo | null
  /** 주소로 들어온 프로젝트를 복원하는 중 (스플래시 표시용) */
  restoring: boolean
  /** 주소로 들어왔는데 비밀번호가 필요한 프로젝트 (목록 위에 입력 모달을 띄운다) */
  pendingPassword: ProjectSummary | null
  openProject: (summary: ProjectSummary, password?: string) => Promise<boolean>
  /** data 를 주면 그 내용으로(구버전 가져오기 등), 없으면 기본값으로 생성. slug 를 비우면 uuid 주소를 쓴다 */
  createProject: (name: string, password: string, data?: PlannerData, slug?: string | null) => Promise<void>
  /**
   * 현재 프로젝트의 제목·주소 변경 (편집 권한자만).
   * 주소가 이미 쓰이고 있으면 false 를 돌려준다 (모달에서 안내 문구로 쓴다).
   */
  updateCurrentMeta: (patch: { name: string; slug: string | null }) => Promise<boolean>
  /** 현재 상태를 새 버전으로 저장 (편집 권한자만) */
  saveVersion: (label: string, note: string) => Promise<VersionSummary | null>
  /** 옛 버전을 읽기 전용으로 화면에 로드 (자동저장 중단, 현재 상태는 백업) */
  previewVersion: (v: PreviewInfo) => Promise<void>
  /** 미리보기를 끝내고 백업한 현재 상태로 복귀 */
  exitPreview: () => void
  /** 옛 버전을 현재 내용으로 되돌린다 (복원 직전 상태는 자동 버전으로 남긴다) */
  restoreVersion: (v: PreviewInfo) => Promise<void>
  backToLanding: () => void
  /** 현재 주소에 맞춰 화면을 맞춘다 (앱 부팅·뒤로가기/앞으로가기) */
  restoreFromUrl: () => Promise<void>
  /** 비밀번호 입력을 취소하고 목록 주소로 되돌린다 */
  cancelPendingPassword: () => void
  /** 로그인 상태가 아니라 복원을 진행할 수 없을 때 스플래시를 끈다 */
  cancelRestore: () => void
  /** 대기 중인 저장을 즉시 반영 (탭 닫기·목록 이동 전) */
  flush: () => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribe: (() => void) | null = null
/** 미리보기 진입 전 라이브 내용 백업 (미리보기/복원에서 되돌릴 때 쓴다) */
let liveBackup: PlannerData | null = null

/** 지금 열려 있는 프로젝트가 그 주소가 가리키는 프로젝트인지 */
const matchesCurrent = (cur: CurrentProject | null, ref: ProjectRef) =>
  !!cur && (ref.by === 'id' ? cur.id === ref.value : cur.slug === ref.value)

/**
 * 주소를 바꾼다. 이미 그 주소면 항목을 새로 쌓지 않는다
 * (딥링크로 들어온 경우 뒤로가기에 같은 화면이 두 번 남는 것을 막는다).
 */
const pushUrl = (path: string) => {
  if (typeof window === 'undefined' || window.location.pathname === path) return
  window.history.pushState({ mp: true }, '', path)
}
/** 잘못된 주소를 히스토리에 남기지 않고 목록으로 바꿔 끼울 때 쓴다 */
const replaceUrl = (path: string) => {
  if (typeof window !== 'undefined') window.history.replaceState({ mp: true }, '', path)
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

  /** 목록 화면 상태로 되돌린다. 주소 변경은 호출한 쪽에서 한다 */
  const resetToLanding = () => {
    get().flush()
    stopAutosave()
    liveBackup = null
    set({
      view: 'landing',
      current: null,
      readonly: false,
      saveState: 'idle',
      openPassword: null,
      preview: null,
      pendingPassword: null,
    })
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
    // 프로젝트 주소로 들어왔다면 첫 렌더부터 스플래시를 띄워 목록이 깜빡이지 않게 한다
    restoring: parseRoute().name === 'project',
    pendingPassword: null,

    openProject: async (summary, password) => {
      const opened = await apiOpen(summary.id, password)
      if (!opened) return false
      usePlannerStore.getState().loadProject(opened.data)
      set({
        view: 'project',
        current: {
          id: opened.id,
          name: opened.name,
          slug: opened.slug,
          isMine: opened.is_mine,
          canEdit: opened.can_edit,
          updatedAt: opened.updated_at,
        },
        readonly: !opened.can_edit,
        saveState: 'idle',
        openPassword: password ?? null,
        preview: null,
        pendingPassword: null,
      })
      if (opened.can_edit) startAutosave()
      else stopAutosave()
      pushUrl(projectPath(opened))
      return true
    },

    createProject: async (name, password, data, slug) => {
      const payload = data ?? defaultPlannerData()
      const id = await apiCreate(name, password, payload, slug)
      usePlannerStore.getState().loadProject(payload)
      set({
        view: 'project',
        current: { id, name, slug: slug || null, isMine: true, canEdit: true, updatedAt: new Date().toISOString() },
        readonly: false,
        saveState: 'saved',
        openPassword: password ?? null,
        preview: null,
        pendingPassword: null,
      })
      startAutosave()
      pushUrl(projectPath({ id, slug }))
    },

    updateCurrentMeta: async ({ name, slug }) => {
      const cur = get().current
      if (!cur || get().readonly) return false
      const trimmed = name.trim()
      const nextSlug = slug || null
      if (!trimmed) return false
      const patch: { name?: string; slug?: string | null } = {}
      if (trimmed !== cur.name) patch.name = trimmed
      if (nextSlug !== cur.slug) patch.slug = nextSlug
      if (Object.keys(patch).length === 0) return true
      try {
        await updateProjectMeta(cur.id, patch)
        const next = { ...cur, name: trimmed, slug: nextSlug }
        set({ current: next })
        // 주소가 바뀌면 보고 있던 주소도 새 주소로 바꿔 끼운다 (히스토리는 늘리지 않는다)
        if (patch.slug !== undefined) replaceUrl(projectPath(next))
        useToastStore.getState().show('프로젝트 정보를 저장했어요 ✓')
        return true
      } catch (e) {
        if (isSlugTaken(e)) return false
        useToastStore.getState().show('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
        console.error('[updateCurrentMeta]', e)
        return false
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
      const editable = get().current?.canEdit ?? false
      set({ preview: null, readonly: !editable })
      if (editable) startAutosave()
    },

    restoreVersion: async v => {
      const cur = get().current
      if (!cur || !cur.canEdit) return
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
      resetToLanding()
      pushUrl(LANDING_PATH)
    },

    restoreFromUrl: async () => {
      const route = parseRoute()
      if (route.name === 'landing') {
        if (get().view === 'project') resetToLanding()
        set({ restoring: false, pendingPassword: null })
        return
      }
      // 이미 그 프로젝트를 보고 있으면 다시 열지 않는다 (앞으로가기/중복 호출)
      if (get().view === 'project' && matchesCurrent(get().current, route.ref)) {
        set({ restoring: false })
        return
      }
      set({ restoring: true })
      const giveUp = (message: string) => {
        useToastStore.getState().show(message)
        replaceUrl(LANDING_PATH)
        resetToLanding()
      }
      try {
        // 주소만으로는 이름·비번 여부를 알 수 없어 목록에서 찾아온다
        const summary = (await listProjects()).find(p =>
          route.ref.by === 'id' ? p.id === route.ref.value : p.slug === route.ref.value,
        )
        if (!summary) {
          giveUp('프로젝트를 찾을 수 없어요.')
        } else if (summary.can_bypass_password) {
          await get().openProject(summary)
        } else if (summary.has_password) {
          // 목록 위에 비밀번호 모달을 띄운다. 주소는 그대로 둬서 입력에 성공하면 바로 그 프로젝트가 열린다
          set({ pendingPassword: summary })
        } else {
          giveUp('아직 공유되지 않은 프로젝트예요.')
        }
      } catch (e) {
        giveUp('프로젝트를 여는 중 문제가 생겼어요.')
        console.error('[restoreFromUrl]', e)
      } finally {
        set({ restoring: false })
      }
    },

    cancelPendingPassword: () => {
      set({ pendingPassword: null })
      replaceUrl(LANDING_PATH)
    },

    cancelRestore: () => set({ restoring: false }),

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

  // 뒤로가기·앞으로가기: 주소를 다시 읽어 화면을 맞춘다
  // (목록 ↔ 프로젝트 상세 모두 이 경로로 처리된다)
  window.addEventListener('popstate', () => {
    void useWorkspaceStore.getState().restoreFromUrl()
  })
}
