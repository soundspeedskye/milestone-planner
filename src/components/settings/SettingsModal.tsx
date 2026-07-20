import { useState } from 'react'
import { RoleSettings } from './RoleSettings'
import { HolidaySettings } from './HolidaySettings'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'roles' | 'holidays'>('roles')

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2>⚙️ 설정</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tabs tabs" style={{ marginBottom: 0 }}>
          <button className={`tab-btn ${tab === 'roles' ? 'active' : ''}`} onClick={() => setTab('roles')}>직군</button>
          <button className={`tab-btn ${tab === 'holidays' ? 'active' : ''}`} onClick={() => setTab('holidays')}>휴무일</button>
        </div>
        <div className="modal-body">
          {tab === 'roles' ? <RoleSettings /> : <HolidaySettings />}
        </div>
      </div>
    </div>
  )
}
