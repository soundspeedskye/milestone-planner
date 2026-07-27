import { Fragment, useMemo } from 'react'
import { MONTHS_KO } from '../../constants/date'
import { fmt, isWeekend, pad, parseDate } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useHolidaySet, useRoleOffSet, useScheduleRange, useSchedules } from '../../store/useScheduleStore'

/** 태스크 이름 라벨. 이름만 이 셀에서 구독해, 이름 입력이 그리드 전체 리렌더로 번지지 않게 한다. */
function TaskLabel({ id, rowSpan }: { id: number; rowSpan: number }) {
  const name = usePlannerStore(s => s.ganttTasks.find(t => t.id === id)?.name)
  return (
    <td className="g-task-label" rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>{name || '(무제)'}</td>
  )
}

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

  // 오늘(자정 기준) 문자열. 매 렌더 계산해도 fmt 한 번이라 값이 그대로면
  // 아래 colMeta 메모가 재계산되지 않는다(자정을 넘기면 자연히 갱신).
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayFmt = fmt(today)

  // 컬럼별 날짜 문자열·쉬는 날 판정·오늘 여부를 한 번만 계산한다.
  // (기존엔 셀마다 fmt/offClass를 다시 호출해 렌더당 수천 번씩 돌았다)
  const colMeta = useMemo(
    () => cols.map(d => {
      const df = fmt(d)
      return {
        df,
        date: pad(d.getDate()),
        off: holidaySet.has(df) ? 'holiday' : isWeekend(d) ? 'weekend' : '',
        isToday: df === todayFmt,
      }
    }),
    [cols, holidaySet, todayFmt],
  )

  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = []
    let prevMo: string | null = null
    cols.forEach(d => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (key !== prevMo) {
        groups.push({ label: `${d.getFullYear()}년 ${MONTHS_KO[d.getMonth()]}`, count: 1 })
        prevMo = key
      } else {
        groups[groups.length - 1].count++
      }
    })
    return groups
  }, [cols])

  if (!range || !startDate) {
    return <div className="gantt-wrap"><div className="empty-gantt">간트에 태스크를 추가하면 차트가 나타납니다</div></div>
  }

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
            {colMeta.map((c, i) => {
              const cls = c.isToday ? 'today-header' : c.off
              return <th key={i} className={`date-cell ${cls}`} style={{ fontSize: 9 }}>{c.date}</th>
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
                      {ri === 0 && <TaskLabel id={s.id} rowSpan={rks.length} />}
                      <td className="g-role-label" style={{ color: r.palette.header, fontWeight: 500 }}>
                        {r.name}<br /><span style={{ color: '#bbb', fontSize: 9 }}>{info.days}일</span>
                      </td>
                      {colMeta.map((c, ci) => {
                        // 기간 안이어도 쉬는 날엔 막대 대신 빗금을 깔아 쉬는 날임을 드러낸다.
                        // 이 직군만 쉬는 날은 같은 줄에서만 쉬는 날로 친다
                        const off = c.off || (roleOff?.has(c.df) ? 'role-off' : '')
                        const inRange = c.df >= sf && c.df <= ef
                        const filled = inRange && !off
                        const hatched = inRange && !!off
                        return (
                          <td
                            key={ci}
                            className={`date-cell ${off}${hatched ? ' bar-off' : ''}`}
                            style={{
                              ...(filled ? { background: r.palette.bar } : {}),
                              ...(c.isToday ? { borderLeft: '2px solid #E24B4A' } : {}),
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
