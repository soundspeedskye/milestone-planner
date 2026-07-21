import { Fragment, useMemo } from 'react'
import { MONTHS_KO } from '../../constants/date'
import { fmt, isWeekend, pad, parseDate } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useHolidaySet, useRoleOffSet, useScheduleRange, useSchedules } from '../../store/useScheduleStore'

export function GanttChart() {
  const startDate = usePlannerStore(s => s.startDate)
  const roles = usePlannerStore(s => s.roles)
  const schedules = useSchedules()
  const holidaySet = useHolidaySet()
  const roleOffSet = useRoleOffSet()
  const range = useScheduleRange()

  const cols = useMemo(() => {
    if (!range || !startDate) return []
    const maxDate = new Date(range.max)
    maxDate.setDate(maxDate.getDate() + 4)
    const list: Date[] = []
    // 차트는 항상 프로젝트 시작일부터 그린다. 고정 시작일 때문에 첫 일정이
    // 시작일보다 앞설 수도 있어서 둘 중 이른 날을 첫 칸으로 쓴다.
    const cur = new Date(Math.min(parseDate(startDate).getTime(), range.min.getTime()))
    while (cur <= maxDate) {
      list.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return list
  }, [range?.min.getTime(), range?.max.getTime(), startDate])

  if (!range || !startDate) {
    return <div className="gantt-wrap"><div className="empty-gantt">간트에 태스크를 추가하면 차트가 나타납니다</div></div>
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayFmt = fmt(today)
  /** 쉬는 날 배경 클래스. 헤더와 본문이 같은 기준을 쓰도록 한 곳에서 판정한다 */
  const offClass = (d: Date) => (holidaySet.has(fmt(d)) ? 'holiday' : isWeekend(d) ? 'weekend' : '')

  const monthGroups: { label: string; count: number }[] = []
  let prevMo: string | null = null
  cols.forEach(d => {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key !== prevMo) {
      monthGroups.push({ label: `${d.getFullYear()}년 ${MONTHS_KO[d.getMonth()]}`, count: 1 })
      prevMo = key
    } else {
      monthGroups[monthGroups.length - 1].count++
    }
  })

  return (
    <div className="gantt-wrap">
      <table className="gantt-table">
        <thead>
          <tr>
            <th className="g-task-label" rowSpan={2} style={{ verticalAlign: 'middle' }}>태스크</th>
            <th className="g-role-label" rowSpan={2} style={{ verticalAlign: 'middle' }}>직군</th>
            {monthGroups.map((mg, i) => (
              <th key={i} colSpan={mg.count} className="month-header">{mg.label}</th>
            ))}
          </tr>
          <tr>
            {cols.map((d, i) => {
              const isToday = fmt(d) === todayFmt
              const cls = isToday ? 'today-header' : offClass(d)
              return <th key={i} className={`date-cell ${cls}`} style={{ fontSize: 9 }}>{pad(d.getDate())}</th>
            })}
          </tr>
        </thead>
        <tbody>
          {schedules.map(s => {
            const rks = roles.filter(r => s.roles[r.id])
            if (rks.length === 0) return null
            return (
              <Fragment key={s.id}>
                {rks.map((r, ri) => {
                  const info = s.roles[r.id]
                  const sf = fmt(info.start)
                  const ef = fmt(info.end)
                  const roleOff = roleOffSet[r.id]
                  return (
                    <tr key={r.id}>
                      {ri === 0 && (
                        <td className="g-task-label" rowSpan={rks.length} style={{ verticalAlign: 'middle' }}>{s.name}</td>
                      )}
                      <td className="g-role-label" style={{ color: r.palette.header, fontWeight: 500 }}>
                        {r.name}<br /><span style={{ color: '#bbb', fontSize: 9 }}>{info.days}일</span>
                      </td>
                      {cols.map((d, ci) => {
                        const df = fmt(d)
                        const isToday = df === todayFmt
                        // 기간 안이어도 쉬는 날엔 막대 대신 빗금을 깔아 쉬는 날임을 드러낸다.
                        // 이 직군만 쉬는 날은 같은 줄에서만 쉬는 날로 친다
                        const off = offClass(d) || (roleOff?.has(df) ? 'role-off' : '')
                        const inRange = df > sf && df <= ef
                        const filled = inRange && !off
                        const hatched = inRange && !!off
                        return (
                          <td
                            key={ci}
                            className={`date-cell ${off}${hatched ? ' bar-off' : ''}`}
                            style={{
                              ...(filled ? { background: r.palette.bar } : {}),
                              ...(isToday ? { borderLeft: '2px solid #E24B4A' } : {}),
                            }}
                          />
                        )
                      })}
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
