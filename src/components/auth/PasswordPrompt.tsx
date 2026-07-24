import { useState } from 'react'
import type { ProjectSummary } from '../../lib/projects'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

/** 남의 프로젝트를 열 때 비번을 받는 모달 */
export function PasswordPrompt({ project, onClose }: { project: ProjectSummary; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const openProject = useWorkspaceStore(s => s.openProject)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const ok = await openProject(project, password)
      if (!ok) {
        setError('비밀번호가 올바르지 않아요.')
        setBusy(false)
        return
      }
      // 성공하면 view 가 project 로 바뀌며 랜딩이 사라진다
    } catch {
      setError('열 수 없어요. 잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔒 {project.name}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form className="auth-body" onSubmit={submit}>
          <p className="auth-hint">{project.owner_name}님의 프로젝트예요. 비밀번호를 입력하면 읽기 전용으로 열려요.</p>
          <label className="auth-field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="프로젝트 비밀번호"
              autoFocus
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '여는 중…' : '열기'}
          </button>
        </form>
      </div>
    </div>
  )
}
