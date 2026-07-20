import { useSchedules } from '../../hooks'
import { scheduleRange } from '../../lib/schedule'
import { fmt, parseDate } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'

export function SummaryBar() {
  const startDate = usePlannerStore(s => s.startDate)
  const roles = usePlannerStore(s => s.roles)
  const ganttTasks = usePlannerStore(s => s.ganttTasks)
  const schedules = useSchedules()

  if (ganttTasks.length === 0 || !startDate) return <div className="summary-bar" />

  const range = scheduleRange(schedules)
  const projectStart = parseDate(startDate)
  const projectEnd = range ? range.max : projectStart

  const roleTotals: Record<string, number> = {}
  schedules.forEach(s => Object.entries(s.roles).forEach(([roleId, r]) => {
    roleTotals[roleId] = (roleTotals[roleId] || 0) + r.days
  }))

  return (
    <div className="summary-bar">
      <div className="sum-card">
        <div className="sum-label">시작일</div>
        <div className="sum-val">{fmt(projectStart)}</div>
      </div>
      <div className="sum-card">
        <div className="sum-label">예상 종료</div>
        <div className="sum-val">{fmt(projectEnd)}</div>
      </div>
      {roles.filter(r => roleTotals[r.id] > 0).map(r => (
        <div className="sum-card" key={r.id}>
          <div className="sum-label" style={{ color: r.palette.header }}>{r.name} 총 소요</div>
          <div className="sum-val">{roleTotals[r.id]}일</div>
        </div>
      ))}
    </div>
  )
}
