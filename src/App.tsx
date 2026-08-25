import { useEffect, useState } from 'react'
import { TopBar } from './components/TopBar'
import { Toast } from './components/Toast'
import { TaskPool } from './components/sidebar/TaskPool'
import { DropZone } from './components/gantt/DropZone'
import { GanttTaskList } from './components/gantt/GanttTaskList'
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

export default function App() {
  const [tab, setTab] = useState<'task' | 'role'>('task')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)

  const authLoading = useAuthStore(s => s.loading)
  const initAuth = useAuthStore(s => s.init)
  const view = useWorkspaceStore(s => s.view)
  const readonly = useWorkspaceStore(s => s.readonly)
  const preview = useWorkspaceStore(s => s.preview)
  // 내 프로젝트가 아닌데 편집이 열려 있으면 슈퍼관리자 권한으로 보고 있는 것
  const adminEditing = useWorkspaceStore(s => !!s.current && !s.current.isMine && s.current.canEdit)

  useEffect(() => { initAuth() }, [initAuth])

  if (authLoading) {
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
      <div className={`app${readonly ? ' readonly' : ''}`}>
        <TopBar onOpenSettings={() => setSettingsOpen(true)} onOpenVersions={() => setVersionsOpen(true)} />
        {!readonly && <TaskPool />}
        <div className="main">
          <div className="main-inner">
            <PreviewBanner />
            {readonly && !preview && <div className="readonly-banner"><EyeIcon size={22} /> 읽기 전용으로 열람 중이에요. 편집은 프로젝트 소유자와 슈퍼관리자만 할 수 있어요.</div>}
            {adminEditing && !preview && <div className="admin-edit-banner"><PencilIcon size={22} /> 슈퍼관리자 권한으로 다른 사람의 프로젝트를 편집 중이에요. 바뀐 내용은 자동으로 저장돼요.</div>}
            {!readonly && <DropZone />}
            {!readonly && <GanttTaskList />}
            <SummaryBar />
            <Legend />
            <div className="tabs">
              <button className={`tab-btn ${tab === 'task' ? 'active' : ''}`} onClick={() => setTab('task')}>태스크별</button>
              <button className={`tab-btn ${tab === 'role' ? 'active' : ''}`} onClick={() => setTab('role')}>직군별</button>
            </div>
            <div className={`tab-panel ${tab === 'task' ? 'active' : ''}`}><GanttChart /></div>
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
