import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useToastStore } from '../../store/useToastStore'
import { AuthModal } from './AuthModal'
import { ProjectGrid } from './ProjectGrid'

export function LandingPage() {
  const user = useAuthStore(s => s.user)
  const configured = useAuthStore(s => s.configured)
  const signOut = useAuthStore(s => s.signOut)
  const show = useToastStore(s => s.show)
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)

  const handleLogout = async () => {
    await signOut()
    show('로그아웃됐어요')
  }

  return (
    <div className="landing">
      <header className="landing-bar">
        <div className="landing-brand">🗓 마일스톤 플래너</div>
        <div className="landing-actions">
          {user ? (
            <>
              <span className="landing-email">{user.email}</span>
              <button className="btn-auth" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn-auth" onClick={() => setAuthMode('signup')}>Sign up</button>
              <button className="btn-auth primary" onClick={() => setAuthMode('signin')}>Sign in</button>
            </>
          )}
        </div>
      </header>

      <main className="landing-main">
        {!configured ? (
          <div className="landing-hero">
            <h1>설정이 필요해요</h1>
            <p>
              Supabase 환경 변수(<code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>)가
              설정되지 않았어요. <code>.env.local</code> 을 채운 뒤 개발 서버를 다시 시작해 주세요.
            </p>
          </div>
        ) : user ? (
          <ProjectGrid />
        ) : (
          <div className="landing-hero">
            <h1>직군별 일정을 자동으로 계산해요</h1>
            <p>소요일만 넣으면 영업일 기준 마일스톤이 그려집니다. 로그인하면 프로젝트를 보고 만들 수 있어요.</p>
            <div className="hero-cta">
              <button className="btn-auth primary" onClick={() => setAuthMode('signin')}>Sign in</button>
              <button className="btn-auth" onClick={() => setAuthMode('signup')}>Sign up</button>
            </div>
          </div>
        )}
      </main>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  )
}
