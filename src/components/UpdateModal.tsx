import { CHANGELOG } from '../constants/changelog'

/** 로그인 후 프로젝트 목록에서 안 본 최신 업데이트를 1회 안내하는 모달 */
export function UpdateModal({ onClose }: { onClose: () => void }) {
  const latest = CHANGELOG[0]
  if (!latest) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal update-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎉 업데이트 소식</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="update-body">
          <div className="update-ver">v{latest.version} · {latest.date}</div>
          <ul className="update-list">
            {latest.changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
          <button className="update-confirm" onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  )
}
