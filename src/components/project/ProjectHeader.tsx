import { useState } from 'react'
import { buildMeetingMarkdown, copyToClipboard } from '../../lib/markdown'
import { buildMilestoneSnapshot, downloadJson } from '../../lib/snapshot'
import { fmt, parseDate } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useScheduleRange, useSchedules, useScheduleStore } from '../../store/useScheduleStore'
import { useToastStore } from '../../store/useToastStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { DiskIcon, EyeIcon, GridIcon, PencilIcon } from '../icons/AppIcons'
import { ProjectMetaModal } from './ProjectMetaModal'
import { DateField } from '../common/DateField'

const saveLabel: Record<string, string> = {
  idle: '', saving: '저장 중…', saved: '저장됨 ✓', error: '저장 실패',
}

function Chevron() {
  return (
    <svg className="crumb-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/**
 * 본문 맨 위의 프로젝트 헤더. 예전 전역 상단바(TopBar)를 대신한다.
 * 이동(목록)·버전·설정은 왼쪽 레일로 갔고, 여기엔 이 프로젝트에 대한 것만 남는다.
 */
export function ProjectHeader() {
  const startDate = usePlannerStore(s => s.startDate)
  const setStartDate = usePlannerStore(s => s.setStartDate)
  const resetAll = usePlannerStore(s => s.resetAll)
  const ganttCount = usePlannerStore(s => s.ganttTasks.length)
  const show = useToastStore(s => s.show)

  const current = useWorkspaceStore(s => s.current)
  const readonly = useWorkspaceStore(s => s.readonly)
  const saveState = useWorkspaceStore(s => s.saveState)

  const schedules = useSchedules()
  const range = useScheduleRange()

  // 내 프로젝트가 아닌데 편집이 열려 있으면 슈퍼관리자 권한으로 들어온 것
  const adminEditing = !!current && !current.isMine && current.canEdit

  // 제목·주소는 인라인이 아니라 모달에서 함께 고친다
  const [metaOpen, setMetaOpen] = useState(false)

  const totalDays = schedules.reduce(
    (sum, s) => sum + Object.values(s.roles).reduce((n, r) => n + r.days, 0),
    0,
  )

  // 일정은 버튼을 눌렀을 때만 필요해서 구독하지 않고 그때 꺼내 쓴다
  const snapshot = () => {
    const { ganttTasks, poolTasks, roles, holidays } = usePlannerStore.getState()
    const { schedules: s } = useScheduleStore.getState()
    return buildMilestoneSnapshot({ startDate, schedules: s, ganttTasks, poolTasks, roles, holidays })
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

  const name = current?.name ?? '마일스톤 플래너'

  return (
    <header className="project-header">
      <div className="crumbs-row">
        <div className="crumbs">
          <button className="btn-back" onClick={() => window.history.back()}>
            <GridIcon size={16} /> 내 프로젝트
          </button>
          <Chevron />
          <span className="crumb-current" title={name}>{name}</span>
        </div>
        <div className="crumbs-right">
          {readonly
            ? <span className="ro-badge"><EyeIcon size={18} /> 읽기 전용</span>
            : <>
                {adminEditing && <span className="admin-badge" title="슈퍼관리자 권한으로 편집 중">관리자 편집</span>}
                <span className="save-state">{saveLabel[saveState]}</span>
                <button className="btn-reset" onClick={handleReset}>초기화</button>
              </>}
        </div>
      </div>

      <div className="ph-title-row">
        <div className="topbar-left">
          <div>
            {readonly ? (
              <h1 className="ph-title">{name}</h1>
            ) : (
              <button className="title-edit-btn" onClick={() => setMetaOpen(true)} title="제목·주소 수정">
                <h1>{name}</h1>
                <span className="title-pen"><PencilIcon size={16} /></span>
              </button>
            )}
            <div className="ph-meta">
              <span className="ph-date">{startDate ? fmt(parseDate(startDate)) : '—'}</span>
              <span>→</span>
              <span className="ph-date">{range ? fmt(range.max) : '—'}</span>
              <span>·</span>
              <span>태스크 {ganttCount}개</span>
              <span>·</span>
              <span>총 {totalDays}일</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <span className="ph-start">
            <label htmlFor="startDate">프로젝트 시작일</label>
            <DateField
              id="startDate"
              value={startDate}
              onChange={v => v && setStartDate(v)}
              disabled={readonly}
              aria-label="프로젝트 시작일"
            />
          </span>
          <button className="btn-reset" onClick={handleCopyMarkdown}>회의록 Markdown 복사</button>
          <button className="btn-save" onClick={handleExport}><DiskIcon size={18} /> 저장(JSON)</button>
        </div>
      </div>

      {metaOpen && <ProjectMetaModal onClose={() => setMetaOpen(false)} />}
    </header>
  )
}
