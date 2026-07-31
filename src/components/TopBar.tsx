import { useRef, useState } from 'react'
import { buildMeetingMarkdown, copyToClipboard } from '../lib/markdown'
import { buildMilestoneSnapshot, downloadJson } from '../lib/snapshot'
import { usePlannerStore } from '../store/usePlannerStore'
import { useScheduleStore } from '../store/useScheduleStore'
import { useToastStore } from '../store/useToastStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { ClockIcon, GearIcon, DiskIcon, EyeIcon } from './icons/AppIcons'
import { DateField } from './common/DateField'

const saveLabel: Record<string, string> = {
  idle: '', saving: '저장 중…', saved: '저장됨 ✓', error: '저장 실패',
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

export function TopBar({ onOpenSettings, onOpenVersions }: { onOpenSettings: () => void; onOpenVersions: () => void }) {
  const startDate = usePlannerStore(s => s.startDate)
  const setStartDate = usePlannerStore(s => s.setStartDate)
  const resetAll = usePlannerStore(s => s.resetAll)
  const show = useToastStore(s => s.show)

  const current = useWorkspaceStore(s => s.current)
  const readonly = useWorkspaceStore(s => s.readonly)
  const saveState = useWorkspaceStore(s => s.saveState)
  const preview = useWorkspaceStore(s => s.preview)
  const renameCurrent = useWorkspaceStore(s => s.renameCurrent)

  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const cancelEdit = useRef(false)

  const startEditTitle = () => {
    setDraftTitle(current?.name ?? '')
    cancelEdit.current = false
    setEditingTitle(true)
  }
  // Enter·다른 곳 클릭(blur) 시 반영, Esc 는 취소. blur 로 일원화한다.
  const commitTitle = () => {
    setEditingTitle(false)
    if (cancelEdit.current) { cancelEdit.current = false; return }
    void renameCurrent(draftTitle)
  }

  // 일정은 버튼을 눌렀을 때만 필요해서 구독하지 않고 그때 꺼내 쓴다
  const snapshot = () => {
    const { ganttTasks, poolTasks, roles, holidays } = usePlannerStore.getState()
    const { schedules } = useScheduleStore.getState()
    return buildMilestoneSnapshot({ startDate, schedules, ganttTasks, poolTasks, roles, holidays })
  }

  const handleCopyMarkdown = async () => {
    await copyToClipboard(buildMeetingMarkdown(snapshot(), usePlannerStore.getState().roles))
    show('회의록 Markdown이 복사됐어요 ✓')
  }

  const handleExport = async () => {
    const result = await downloadJson(snapshot())
    if (result === 'saved') show('milestone-current.json 저장 완료 ✓')
    else if (result === 'downloaded') show('JSON 파일을 다운로드했어요')
  }

  const handleReset = () => {
    if (!confirm('태스크와 직군 설정이 모두 삭제돼요. (휴무일 설정은 유지돼요) 계속할까요?')) return
    resetAll()
    show('초기화됐어요')
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="btn-back" onClick={() => window.history.back()} title="프로젝트 목록으로">← 목록</button>
        {readonly ? (
          <h1>{current?.name ?? '마일스톤 플래너'}</h1>
        ) : editingTitle ? (
          <input
            className="title-edit"
            value={draftTitle}
            autoFocus
            onFocus={e => e.target.select()}
            onChange={e => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              else if (e.key === 'Escape') { cancelEdit.current = true; e.currentTarget.blur() }
            }}
          />
        ) : (
          <button className="title-edit-btn" onClick={startEditTitle} title="제목 수정">
            <h1>{current?.name ?? '마일스톤 플래너'}</h1>
            <span className="title-pen"><PencilIcon /></span>
          </button>
        )}
        {readonly
          ? <span className="ro-badge"><EyeIcon size={22} /> 읽기 전용</span>
          : <span className="save-state">{saveLabel[saveState]}</span>}
      </div>
      <div className="topbar-right">
        <label htmlFor="startDate">프로젝트 시작일</label>
        <DateField
          id="startDate"
          value={startDate}
          onChange={v => v && setStartDate(v)}
          disabled={readonly}
          aria-label="프로젝트 시작일"
        />
        {!preview && <button className="btn-reset" onClick={onOpenVersions}><ClockIcon size={24} /> 버전</button>}
        {!readonly && <button className="btn-reset" onClick={onOpenSettings}><GearIcon size={24} /> 설정</button>}
        {!readonly && <button className="btn-reset" onClick={handleReset}>초기화</button>}
        <button className="btn-reset" onClick={handleCopyMarkdown}>회의록 Markdown 복사</button>
        <button className="btn-save" onClick={handleExport}><DiskIcon size={24} /> 저장(JSON)</button>
      </div>
    </div>
  )
}
