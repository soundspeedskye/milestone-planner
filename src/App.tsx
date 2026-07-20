import { useState } from 'react'
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

export default function App() {
  const [tab, setTab] = useState<'task' | 'role'>('task')
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <div className="app">
        <TopBar onOpenSettings={() => setSettingsOpen(true)} />
        <TaskPool />
        <div className="main">
          <div className="main-inner">
            <DropZone />
            <GanttTaskList />
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
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
