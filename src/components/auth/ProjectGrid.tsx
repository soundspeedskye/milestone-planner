import { useEffect, useState } from 'react'
import { listProjects, type ProjectSummary } from '../../lib/projects'
import { getLegacyData, hasLegacyData, markLegacyImported } from '../../lib/legacyImport'
import type { PlannerData } from '../../types'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useToastStore } from '../../store/useToastStore'
import { LATEST_UPDATE } from '../../constants/changelog'
import { getLastSeenUpdate, markUpdatesSeen } from '../../lib/updateNotice'
import { UpdateModal } from '../UpdateModal'
import { NewProjectModal } from './NewProjectModal'
import { PasswordPrompt } from './PasswordPrompt'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function ProjectGrid() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState<ProjectSummary | null>(null)
  const [creating, setCreating] = useState(false)
  const [importData, setImportData] = useState<PlannerData | null>(null)
  const [legacyAvailable, setLegacyAvailable] = useState(() => hasLegacyData())
  const [showUpdate, setShowUpdate] = useState(false)
  const openProject = useWorkspaceStore(s => s.openProject)
  const show = useToastStore(s => s.show)

  // 로그인 후 목록 진입 시, 안 본 최신 업데이트가 있으면 1회 안내한다.
  // 키가 없는 사용자(신규·기능 배포 전부터 쓰던 기존 사용자 모두)도 최신을 1회 본다.
  useEffect(() => {
    if (getLastSeenUpdate() !== LATEST_UPDATE) setShowUpdate(true)
  }, [])

  const closeUpdate = () => {
    markUpdatesSeen()
    setShowUpdate(false)
  }

  const startImport = () => {
    const data = getLegacyData()
    if (!data) { setLegacyAvailable(false); return }
    setImportData(data)
  }
  const dismissLegacy = () => {
    markLegacyImported()
    setLegacyAvailable(false)
    show('이전 작업 가져오기를 건너뛰었어요')
  }

  useEffect(() => {
    let alive = true
    listProjects()
      .then(list => { if (alive) setProjects(list) })
      .catch(() => { if (alive) setError('목록을 불러오지 못했어요.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const handleClick = async (p: ProjectSummary) => {
    if (p.is_mine) {
      try {
        await openProject(p) // owner 는 비번 없이 바로 열림
      } catch {
        show('프로젝트를 여는 중 문제가 생겼어요.')
      }
    } else if (p.has_password) {
      setPrompt(p)
    } else {
      show('아직 공유되지 않은 프로젝트예요.')
    }
  }

  return (
    <div className="project-grid-wrap">
      <div className="project-grid-head">
        <h2>프로젝트</h2>
        <span className="project-count">{loading ? '' : `${projects.length}개`}</span>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {legacyAvailable && (
        <div className="legacy-banner">
          <span>기존에 세팅한 프로젝트가 있습니다. 가져올까요?</span>
          <div className="legacy-actions">
            <button className="btn-legacy primary" onClick={startImport}>가져오기</button>
            <button className="btn-legacy" onClick={dismissLegacy}>무시</button>
          </div>
        </div>
      )}

      <div className="project-grid">
        <button className="project-card new-card" onClick={() => setCreating(true)}>
          <span className="new-plus">+</span>
          <span>새 프로젝트</span>
        </button>

        {loading && <p className="grid-loading">불러오는 중…</p>}

        {!loading && projects.map(p => (
          <button key={p.id} className="project-card" onClick={() => handleClick(p)}>
            <div className="card-top">
              <span className="card-name">{p.name}</span>
              {p.is_mine
                ? <span className="badge-mine">내 프로젝트</span>
                : p.has_password && <span className="badge-lock" title="비밀번호 필요">🔒</span>}
            </div>
            <div className="card-meta">
              <span>{p.owner_name}</span>
              <span>{formatDate(p.updated_at)}</span>
            </div>
          </button>
        ))}
      </div>

      {showUpdate && <UpdateModal onClose={closeUpdate} />}
      {prompt && <PasswordPrompt project={prompt} onClose={() => setPrompt(null)} />}
      {creating && <NewProjectModal onClose={() => setCreating(false)} />}
      {importData && (
        <NewProjectModal
          importData={importData}
          defaultName="가져온 마일스톤"
          onClose={() => setImportData(null)}
        />
      )}
    </div>
  )
}
