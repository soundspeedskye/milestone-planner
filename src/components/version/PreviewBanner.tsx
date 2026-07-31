import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { ClockIcon, RestoreIcon } from '../icons/AppIcons'

/** ISO → 'YYYY.MM.DD HH:mm' */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 옛 버전을 미리보기 중일 때 화면 상단에 뜨는 배너 */
export function PreviewBanner() {
  const preview = useWorkspaceStore(s => s.preview)
  const isMine = useWorkspaceStore(s => s.current?.isMine ?? false)
  const exitPreview = useWorkspaceStore(s => s.exitPreview)
  const restoreVersion = useWorkspaceStore(s => s.restoreVersion)
  if (!preview) return null

  return (
    <div className="preview-banner">
      <span className="preview-banner-text">
        <ClockIcon size={22} /> <b>{preview.label}</b> ({fmtDateTime(preview.createdAt)}) 미리보기 중 · 지금은 편집이 아니에요
      </span>
      <span className="preview-banner-actions">
        {isMine && (
          <button className="btn-save" onClick={() => void restoreVersion(preview)}>
            <RestoreIcon size={20} /> 이 버전으로 복원
          </button>
        )}
        <button className="btn-reset" onClick={exitPreview}>현재로 돌아가기</button>
      </span>
    </div>
  )
}
