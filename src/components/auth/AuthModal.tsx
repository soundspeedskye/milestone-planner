import { useState } from 'react'
import { emailAllowed, useAuthStore } from '../../store/useAuthStore'
import { useToastStore } from '../../store/useToastStore'

type Mode = 'signin' | 'signup'

export function AuthModal({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = useAuthStore(s => s.signIn)
  const signUp = useAuthStore(s => s.signUp)
  const show = useToastStore(s => s.show)

  const domainInvalid = mode === 'signup' && email.length > 0 && !emailAllowed(email)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && !emailAllowed(email)) {
      setError('safience.com 도메인 이메일만 가입할 수 있어요.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        show('가입 완료 · 로그인됐어요 ✓')
      } else {
        await signIn(email, password)
        show('로그인됐어요 ✓')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 생겼어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); setError('') }}>로그인</button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError('') }}>회원가입</button>
        </div>
        <form className="auth-body" onSubmit={submit}>
          <label className="auth-field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@safience.com"
              autoComplete="email"
              autoFocus
              required
            />
          </label>
          {domainInvalid && <p className="auth-inline-warn">safience.com 도메인만 가입할 수 있어요.</p>}
          <label className="auth-field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '6자 이상' : '비밀번호'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>
          {mode === 'signup' && (
            <p className="auth-hint">이메일 인증은 없어요. safience.com 주소면 바로 가입·로그인됩니다.</p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '처리 중…' : mode === 'signup' ? '회원가입' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
