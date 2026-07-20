import { useSchedules, useWorkdayContext } from '../../hooks'
import { scheduleRange } from '../../lib/schedule'
import { countWD, fmt } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'

const PX = 30

export function RoleView() {
  const roles = usePlannerStore(s => s.roles)
  const schedules = useSchedules()
  const { isWD } = useWorkdayContext()

  const active = schedules.filter(s => Object.keys(s.roles).length > 0)
  if (active.length === 0) {
    return <div className="role-view"><div className="empty-gantt">간트에 태스크를 추가하면 직군별 뷰가 나타납니다</div></div>
  }

  const range = scheduleRange(active)!

  return (
    <div className="role-view">
      <div className="role-timeline">
        {roles.map(role => {
          const blocks = active
            .filter(s => s.roles[role.id])
            .map(s => ({ name: s.name, ...s.roles[role.id] }))
          if (blocks.length === 0) return null

          let prevEnd: Date | null = null
          const items: React.ReactNode[] = []
          blocks.forEach((b, i) => {
            if (prevEnd) {
              const gapWD = countWD(prevEnd, b.start, isWD)
              if (gapWD > 0) {
                const gpx = Math.round(((b.start.getTime() - prevEnd.getTime()) / 86400000) * PX)
                items.push(
                  <div key={`gap-${i}`} className="gap-block" style={{ width: Math.max(gpx, 56) }}>
                    <span className="gap-label">공백 {gapWD}일</span>
                  </div>,
                )
              }
            }
            const wpx = Math.max(Math.round(b.days * PX * 1.4), 64)
            items.push(
              <div
                key={i}
                className="block"
                style={{ width: wpx, background: role.palette.bar, color: role.palette.barText }}
                data-tooltip={`${b.name} | ${fmt(b.start)}~${fmt(b.end)} (${b.days}일)`}
              >
                <span className="block-text">{b.name} ({b.days}일)</span>
              </div>,
            )
            prevEnd = b.end
          })

          return (
            <div className="role-row" key={role.id}>
              <div className="role-name-cell" style={{ color: role.palette.header }}>{role.name}</div>
              <div className="role-blocks">{items}</div>
            </div>
          )
        })}
      </div>
      <div className="role-range">📅 {fmt(range.min)} ~ {fmt(range.max)}</div>
    </div>
  )
}
