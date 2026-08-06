import { countWD, fmt } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useIsWorkday, useScheduleRange, useSchedules } from '../../store/useScheduleStore'
import { CalendarIcon } from '../icons/AppIcons'

const PX = 30

/** 직군 블록. 태스크 이름만 여기서 구독해, 이름 입력이 뷰 전체 리렌더로 번지지 않게 한다. */
function RoleBlock({ id, days, start, end, bar, barText }: {
  id: number; days: number; start: Date; end: Date; bar: string; barText: string
}) {
  const name = usePlannerStore(s => s.ganttTasks.find(t => t.id === id)?.name) || '(무제)'
  const wpx = Math.max(Math.round(days * PX * 1.4), 64)
  return (
    <div
      className="block"
      style={{ width: wpx, background: bar, color: barText }}
      data-tooltip={`${name} | ${fmt(start)}~${fmt(end)} (${days}일)`}
    >
      <span className="block-text">{name} ({days}일)</span>
    </div>
  )
}

export function RoleView() {
  const roles = usePlannerStore(s => s.roles)
  const schedules = useSchedules()
  const isWD = useIsWorkday()
  const range = useScheduleRange()

  const active = schedules.filter(s => Object.keys(s.roles).length > 0)
  if (active.length === 0 || !range) {
    return <div className="role-view"><div className="empty-gantt">간트에 태스크를 추가하면 직군별 뷰가 나타납니다</div></div>
  }

  return (
    <div className="role-view">
      <div className="role-timeline">
        {roles.map(role => {
          const blocks = active
            .filter(s => s.roles[role.id])
            .map(s => ({ id: s.id, ...s.roles[role.id] }))
          if (blocks.length === 0) return null

          // 공백은 전사 영업일 기준으로 센다 (연차는 일정·공백에 영향 없음)
          const roleWD = isWD
          let prevEnd: Date | null = null
          const items: React.ReactNode[] = []
          blocks.forEach((b, i) => {
            if (prevEnd) {
              // prevEnd(직전 마지막 작업일)와 b.start(이번 첫 작업일)가 모두
              // inclusive라, 연속이면 countWD가 b.start를 1로 세므로 1을 뺀다.
              const gapWD = countWD(prevEnd, b.start, roleWD) - 1
              if (gapWD > 0) {
                const gpx = Math.round(((b.start.getTime() - prevEnd.getTime()) / 86400000) * PX)
                items.push(
                  <div key={`gap-${i}`} className="gap-block" style={{ width: Math.max(gpx, 56) }}>
                    <span className="gap-label">공백 {gapWD}일</span>
                  </div>,
                )
              }
            }
            items.push(
              <RoleBlock
                key={i}
                id={b.id}
                days={b.days}
                start={b.start}
                end={b.end}
                bar={role.palette.bar}
                barText={role.palette.barText}
              />,
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
      <div className="role-range"><CalendarIcon size={20} /> {fmt(range.min)} ~ {fmt(range.max)}</div>
    </div>
  )
}
