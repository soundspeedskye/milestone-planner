import { Fragment, useMemo } from 'react'
import { MONTHS_KO } from '../../constants/holidays'
import { useSchedules, useWorkdayContext } from '../../hooks'
import { scheduleRange } from '../../lib/schedule'
import { fmt, isWeekend, pad } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'

export function GanttChart() {
  const startDate = usePlannerStore(s => s.startDate)
  const roles = usePlannerStore(s => s.roles)
  const schedules = useSchedules()
  const { holidaySet } = useWorkdayContext()

  const range = scheduleRange(schedules)

  const cols = useMemo(() => {
    if (!range || !startDate) return []
    const maxDate = new Date(range.max)
    maxDate.setDate(maxDate.getDate() + 4)
    const list: Date[] = []
    const cur = new Date(range.min)
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
  const isHoliday = (d: Date) => holidaySet.has(fmt(d))

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
              const cls = isToday ? 'today-header' : isHoliday(d) ? 'holiday' : isWeekend(d) ? 'weekend' : ''
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
                        const inRange = df > sf && df <= ef
                        const isToday = df === todayFmt
                        const cls = inRange ? '' : isHoliday(d) ? 'holiday' : isWeekend(d) ? 'weekend' : ''
                        return (
                          <td
                            key={ci}
                            className={`date-cell ${cls}`}
                            style={{
                              ...(inRange ? { background: r.palette.bar } : {}),
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
