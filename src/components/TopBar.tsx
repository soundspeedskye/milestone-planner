import { useSchedules } from '../hooks'
import { buildMeetingMarkdown, copyToClipboard } from '../lib/markdown'
import { buildMilestoneSnapshot, downloadJson } from '../lib/snapshot'
import { usePlannerStore } from '../store/usePlannerStore'
import { useToastStore } from '../store/useToastStore'

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const startDate = usePlannerStore(s => s.startDate)
  const setStartDate = usePlannerStore(s => s.setStartDate)
  const resetAll = usePlannerStore(s => s.resetAll)
  const schedules = useSchedules()
  const show = useToastStore(s => s.show)

  const snapshot = () => {
    const { ganttTasks, poolTasks, roles } = usePlannerStore.getState()
    return buildMilestoneSnapshot({ startDate, schedules, ganttTasks, poolTasks, roles })
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
    if (!confirm('초기화하면 저장된 데이터도 삭제돼요. 계속할까요?')) return
    resetAll()
    show('초기화됐어요')
  }

  return (
    <div className="topbar">
      <h1>🗓 마일스톤 플래너</h1>
      <div className="topbar-right">
        <label htmlFor="startDate">프로젝트 시작일</label>
        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <button className="btn-reset" onClick={onOpenSettings}>⚙️ 설정</button>
        <button className="btn-reset" onClick={handleReset}>초기화</button>
        <button className="btn-reset" onClick={handleCopyMarkdown}>회의록 Markdown 복사</button>
        <button className="btn-save" onClick={handleExport}>💾 저장(JSON)</button>
      </div>
    </div>
  )
}
