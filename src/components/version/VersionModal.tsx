import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useToastStore } from '../../store/useToastStore'
import { listVersions, deleteVersion, type VersionSummary } from '../../lib/versions'
import { ClockIcon, EyeIcon, RestoreIcon } from '../icons/AppIcons'

/** ISO 문자열을 'YYYY.MM.DD HH:mm' 으로 (상대시간 대신 정확한 날짜를 보여준다) */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function VersionModal({ onClose }: { onClose: () => void }) {
  const current = useWorkspaceStore(s => s.current)
  const openPassword = useWorkspaceStore(s => s.openPassword)
  const saveVersion = useWorkspaceStore(s => s.saveVersion)
  const previewVersion = useWorkspaceStore(s => s.previewVersion)
  const restoreVersion = useWorkspaceStore(s => s.restoreVersion)
  const show = useToastStore(s => s.show)
  const canEdit = current?.canEdit ?? false

  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    if (!current) return
    try {
      setVersions(await listVersions(current.id, openPassword ?? undefined))
    } catch (e) {
      show('버전 목록을 불러오지 못했어요.')
      console.error('[listVersions]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // 마운트 시 1회 로드 + Esc 바인딩
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setBusy(true)
    const saved = await saveVersion(label.trim(), note.trim())
    setBusy(false)
    if (saved) {
      setLabel('')
      setNote('')
      void reload()
    }
  }

  const handlePreview = async (v: VersionSummary) => {
    await previewVersion({ id: v.id, label: v.label, createdAt: v.created_at })
    onClose() // 배너로 미리보기 상태를 보여주기 위해 모달을 닫는다
  }

  const handleRestore = async (v: VersionSummary) => {
    if (!confirm(`'${v.label}' 버전으로 되돌릴까요?\n지금 내용은 자동으로 한 버전 저장돼요.`)) return
    await restoreVersion({ id: v.id, label: v.label, createdAt: v.created_at })
    onClose()
  }

  const handleDelete = async (v: VersionSummary) => {
    if (!confirm(`'${v.label}' 버전을 삭제할까요? 되돌릴 수 없어요.`)) return
    try {
      await deleteVersion(v.id)
      show(`'${v.label}' 버전을 삭제했어요`)
      void reload()
    } catch (e) {
      show('버전을 삭제하지 못했어요.')
      console.error('[deleteVersion]', e)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-version">
        <div className="modal-header">
          <h2><ClockIcon size={28} /> 버전 관리</h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {canEdit && (
          <div className="version-save">
            <div className="version-save-row">
              <input
                className="version-label-input"
                placeholder={`버전 이름 (비우면 자동 v${versions.length + 1})`}
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
              <button className="btn-save" onClick={handleSave} disabled={busy}>
                ＋ 현재 상태 저장
              </button>
            </div>
            <input
              className="version-note-input"
              placeholder="메모 (선택)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        )}

        <div className="modal-body version-list">
          {loading ? (
            <div className="version-empty">불러오는 중…</div>
          ) : versions.length === 0 ? (
            <div className="version-empty">아직 저장된 버전이 없어요.</div>
          ) : (
            versions.map((v, i) => (
              <div className="version-row" key={v.id}>
                <div className="version-meta">
                  <div className="version-title">
                    {v.label}
                    {i === 0 && <span className="version-latest">최신</span>}
                  </div>
                  <div className="version-sub">
                    {fmtDateTime(v.created_at)} · {v.owner_name}
                    {v.note ? ` · ${v.note}` : ''}
                  </div>
                </div>
                <div className="version-actions">
                  <button className="btn-ver btn-ver-view" onClick={() => handlePreview(v)}>
                    <EyeIcon size={20} /> 보기
                  </button>
                  {canEdit && (
                    <>
                      <button className="btn-ver btn-ver-restore" onClick={() => handleRestore(v)}>
                        <RestoreIcon size={20} /> 복원
                      </button>
                      <button
                        className="btn-ver btn-ver-del"
                        onClick={() => handleDelete(v)}
                        aria-label="버전 삭제"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
