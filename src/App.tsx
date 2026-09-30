import { useEffect, useState } from 'react'
import { Toast } from './components/Toast'
import { AppRail } from './components/shell/AppRail'
import { ProjectHeader } from './components/project/ProjectHeader'
import { TaskPool } from './components/sidebar/TaskPool'
import { SummaryBar } from './components/gantt/SummaryBar'
import { Legend } from './components/gantt/Legend'
import { GanttChart } from './components/gantt/GanttChart'
import { RoleView } from './components/gantt/RoleView'
import { SettingsModal } from './components/settings/SettingsModal'
import { VersionModal } from './components/version/VersionModal'
import { PreviewBanner } from './components/version/PreviewBanner'
import { EyeIcon, PencilIcon } from './components/icons/AppIcons'
import { LandingPage } from './components/auth/LandingPage'
import { useAuthStore } from './store/useAuthStore'
import { useWorkspaceStore } from './store/useWorkspaceStore'

const TASK_POOL_COLLAPSED_KEY = 'milestone-planner:task-pool-collapsed'
const COMPACT_SIDEBAR_QUERY = '(max-width: 1099px)'

function readTaskPoolPreference() {
  try {
    return window.localStorage.getItem(TASK_POOL_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

function isCompactSidebar() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_SIDEBAR_QUERY).matches
}

export default function App() {
  const [tab, setTab] = useState<'task' | 'role'>('task')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  // 데스크톱에서 사용자가 고른 접힘 상태는 기억하고, 좁은 화면의 자동 접힘과는 분리한다.
  const [taskPoolCollapsed, setTaskPoolCollapsed] = useState(readTaskPoolPreference)
  const [compactSidebar, setCompactSidebar] = useState(isCompactSidebar)
  const [compactPoolOpen, setCompactPoolOpen] = useState(false)

  const authLoading = useAuthStore(s => s.loading)
  const initAuth = useAuthStore(s => s.init)
  const user = useAuthStore(s => s.user)
  const view = useWorkspaceStore(s => s.view)
  const restoring = useWorkspaceStore(s => s.restoring)
  const restoreFromUrl = useWorkspaceStore(s => s.restoreFromUrl)
  const cancelRestore = useWorkspaceStore(s => s.cancelRestore)
  const readonly = useWorkspaceStore(s => s.readonly)
  const preview = useWorkspaceStore(s => s.preview)
  const currentProjectId = useWorkspaceStore(s => s.current?.id)
  // 내 프로젝트가 아닌데 편집이 열려 있으면 슈퍼관리자 권한으로 보고 있는 것
  const adminEditing = useWorkspaceStore(s => !!s.current && !s.current.isMine && s.current.canEdit)

  useEffect(() => { initAuth() }, [initAuth])

  // 주소(/p/<id>)에 맞춰 화면을 복원한다. 로그인 전이라면 랜딩을 보여주고,
  // 로그인에 성공하면 user 가 채워지며 이 effect 가 다시 돌아 그 프로젝트를 연다.
  useEffect(() => {
    if (authLoading) return
    if (!user) { cancelRestore(); return }
    void restoreFromUrl()
  }, [authLoading, user, restoreFromUrl, cancelRestore])

  useEffect(() => {
    try {
      window.localStorage.setItem(TASK_POOL_COLLAPSED_KEY, String(taskPoolCollapsed))
    } catch {
      // 저장 공간을 쓸 수 없는 환경에서는 이번 화면에서만 상태를 유지한다.
    }
  }, [taskPoolCollapsed])

  useEffect(() => {
    const media = window.matchMedia(COMPACT_SIDEBAR_QUERY)
    const sync = () => {
      setCompactSidebar(media.matches)
      // 넓은 화면으로 돌아오면 오버레이를 닫고, 저장된 데스크톱 선택을 다시 따른다.
      if (!media.matches) setCompactPoolOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!compactPoolOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCompactPoolOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [compactPoolOpen])

  const poolIsCollapsed = compactSidebar ? !compactPoolOpen : taskPoolCollapsed
  const toggleTaskPool = () => {
    if (compactSidebar) setCompactPoolOpen(open => !open)
    else setTaskPoolCollapsed(collapsed => !collapsed)
  }

  if (authLoading || restoring) {
    return (
      <>
        <div className="splash">불러오는 중…</div>
        <Toast />
      </>
    )
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage />
        <Toast />
      </>
    )
  }

  return (
    <>
      <div className={`app${readonly ? ' readonly' : ''}${!readonly && compactSidebar ? ' sidebar-compact' : ''}${!readonly && !compactSidebar && taskPoolCollapsed ? ' sidebar-collapsed' : ''}`}>
        <AppRail
          poolOpen={!poolIsCollapsed}
          onTogglePool={toggleTaskPool}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenVersions={() => setVersionsOpen(true)}
        />
        {!readonly && <TaskPool collapsed={poolIsCollapsed} compact={compactSidebar} onToggle={toggleTaskPool} />}
        <div className="main">
          {!readonly && compactSidebar && compactPoolOpen && (
            <button className="sidebar-scrim" onClick={() => setCompactPoolOpen(false)} aria-label="태스크 보관함 닫기" />
          )}
          <div className="main-inner">
            <ProjectHeader />
            <PreviewBanner />
            {readonly && !preview && <div className="readonly-banner"><EyeIcon size={20} /> 읽기 전용으로 열람 중이에요. 편집은 프로젝트 소유자와 슈퍼관리자만 할 수 있어요.</div>}
            {adminEditing && !preview && <div className="admin-edit-banner"><PencilIcon size={20} /> 슈퍼관리자 권한으로 다른 사람의 프로젝트를 편집 중이에요. 바뀐 내용은 자동으로 저장돼요.</div>}
            <SummaryBar />
            <div className="view-switch">
              <div className="tabs">
                <button className={`tab-btn ${tab === 'task' ? 'active' : ''}`} onClick={() => setTab('task')}>태스크별</button>
                <button className={`tab-btn ${tab === 'role' ? 'active' : ''}`} onClick={() => setTab('role')}>직군별</button>
              </div>
              <Legend />
            </div>
            <div className={`tab-panel ${tab === 'task' ? 'active' : ''}`}><GanttChart key={currentProjectId ?? 'new-project'} /></div>
            <div className={`tab-panel ${tab === 'role' ? 'active' : ''}`}><RoleView /></div>
          </div>
        </div>
      </div>
      <Toast />
      {!readonly && settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {versionsOpen && <VersionModal onClose={() => setVersionsOpen(false)} />}
    </>
  )
}
