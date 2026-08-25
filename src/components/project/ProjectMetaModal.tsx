import { useState } from 'react'
import { listProjects } from '../../lib/projects'
import { isValidSlug, normalizeSlug } from '../../lib/route'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

/**
 * 프로젝트 제목·주소를 함께 고치는 모달 (편집 권한자만 연다).
 *
 * 주소는 선택 입력이다. 비우면 주소를 떼고 /p/<uuid> 로 돌아간다.
 * 형식·중복은 여기서 미리 알려주고, 최종 판정은 DB 제약이 한다.
 */
export function ProjectMetaModal({ onClose }: { onClose: () => void }) {
  const current = useWorkspaceStore(s => s.current)
  const updateCurrentMeta = useWorkspaceStore(s => s.updateCurrentMeta)

  const [name, setName] = useState(current?.name ?? '')
  const [slug, setSlug] = useState(current?.slug ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!current) return null

  const nextSlug = normalizeSlug(slug)
  const slugChanged = nextSlug !== (current.slug ?? '')
  const formatError = nextSlug !== '' && !isValidSlug(nextSlug)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('프로젝트 이름을 입력해 주세요.'); return }
    if (formatError) { setError('주소는 소문자·숫자·하이픈만 쓸 수 있어요 (2~40자).'); return }
    setBusy(true)
    // 중복은 저장할 때 DB 가 최종 판정하지만, 먼저 알려주면 실패를 한 번 줄일 수 있다
    if (nextSlug && slugChanged) {
      try {
        const taken = (await listProjects()).some(p => p.slug === nextSlug && p.id !== current.id)
        if (taken) { setError('이미 쓰고 있는 주소예요.'); setBusy(false); return }
      } catch {
        // 목록을 못 불러와도 저장은 시도한다 (DB 제약이 막아 준다)
      }
    }
    const ok = await updateCurrentMeta({ name, slug: nextSlug || null })
    if (!ok) { setError('이미 쓰고 있는 주소예요.'); setBusy(false); return }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>프로젝트 정보</h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <form className="auth-body" onSubmit={submit}>
          <label className="auth-field">
            <span>이름</span>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus required />
          </label>

          <label className="auth-field">
            <span>주소</span>
            <span className="slug-input">
              <span className="slug-prefix">/p/</span>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="지정하지 않으면 자동으로 생성돼요"
                spellCheck={false}
              />
            </span>
          </label>
          <p className="auth-hint">
            {nextSlug
              ? `이 프로젝트는 /p/${nextSlug} 로 열려요.`
              : `주소를 비우면 자동으로 만들어진 주소(/p/${current.id})를 써요.`}
          </p>
          {slugChanged && current.slug && (
            <p className="auth-hint warn">
              주소를 바꾸면 전에 공유한 /p/{current.slug} 링크는 열리지 않아요.
              자동으로 만들어진 주소는 계속 쓸 수 있어요.
            </p>
          )}

          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy || formatError}>
            {busy ? '저장 중…' : '저장'}
          </button>
        </form>
      </div>
    </div>
  )
}
