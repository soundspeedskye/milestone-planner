import { useState } from 'react'
import type { PlannerData } from '../../types'
import { markLegacyImported } from '../../lib/legacyImport'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useToastStore } from '../../store/useToastStore'

/**
 * 새 프로젝트 만들기: 이름 + 열람용 비밀번호(필수).
 * importData 를 주면 그 내용(구버전 가져오기)으로 생성하고, 완료 시 가져오기 플래그를 남긴다.
 */
export function NewProjectModal({
  onClose,
  importData,
  defaultName = '',
}: {
  onClose: () => void
  importData?: PlannerData
  defaultName?: string
}) {
  const [name, setName] = useState(defaultName)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const createProject = useWorkspaceStore(s => s.createProject)
  const show = useToastStore(s => s.show)
  const importing = Boolean(importData)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('프로젝트 이름을 입력해 주세요.'); return }
    if (password.length < 4) { setError('비밀번호는 4자 이상으로 정해 주세요.'); return }
    setBusy(true)
    try {
      await createProject(name.trim(), password, importData)
      if (importing) markLegacyImported()
      show(importing ? '이전 작업을 가져왔어요 ✓' : '프로젝트를 만들었어요 ✓')
      // view 가 project 로 바뀌며 모달이 있는 랜딩이 사라진다
    } catch {
      setError(importing ? '가져오지 못했어요. 잠시 후 다시 시도해 주세요.' : '만들지 못했어요. 잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{importing ? '이전 작업 가져오기' : '새 프로젝트'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <form className="auth-body" onSubmit={submit}>
          {importing && (
            <p className="auth-hint">이 브라우저에 저장돼 있던 이전 버전의 태스크·직군·휴무일 설정을 새 프로젝트로 가져와요.</p>
          )}
          <label className="auth-field">
            <span>이름</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 1월 앱 개편" autoFocus required />
          </label>
          <label className="auth-field">
            <span>열람 비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="다른 사람이 열 때 필요해요 (4자 이상)"
              required
            />
          </label>
          <p className="auth-hint">다른 회원이 이 프로젝트를 열려면 이 비밀번호가 필요해요. 나중에 설정에서 바꿀 수 있어요.</p>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? (importing ? '가져오는 중…' : '만드는 중…') : (importing ? '가져오기' : '만들기')}
          </button>
        </form>
      </div>
    </div>
  )
}
