import { useState } from 'react'
import { useSchedules } from '../../hooks'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'

export function GanttTaskList() {
  const ganttTasks = usePlannerStore(s => s.ganttTasks)
  const roles = usePlannerStore(s => s.roles)
  const ejectFromGantt = usePlannerStore(s => s.ejectFromGantt)
  const reorderGantt = usePlannerStore(s => s.reorderGantt)
  const setFixedStart = usePlannerStore(s => s.setFixedStart)
  const { ganttIndex, setGanttIndex } = useDragStore()
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const schedules = useSchedules()

  if (ganttTasks.length === 0) return <div className="gantt-tasks" />

  return (
    <div className="gantt-tasks">
      {ganttTasks.map((t, i) => {
        const warnings = schedules.find(s => s.id === t.id)?.warnings ?? []
        return (
          <div
            key={t.id}
            className={`gantt-task-item ${ganttIndex === i ? 'dragging' : ''} ${overIndex === i ? 'drag-over' : ''}`}
            draggable
            onDragStart={e => {
              setGanttIndex(i)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('source', 'gantt')
            }}
            onDragEnd={() => setGanttIndex(null)}
            onDragOver={e => {
              e.preventDefault()
              setOverIndex(i)
            }}
            onDragLeave={() => setOverIndex(null)}
            onDrop={e => {
              e.preventDefault()
              setOverIndex(null)
              const { ganttIndex: from } = useDragStore.getState()
              if (e.dataTransfer.getData('source') === 'gantt' && from !== null && from !== i) {
                reorderGantt(from, i)
                setGanttIndex(null)
              }
            }}
          >
            <span className="drag-handle-gantt">⠿</span>
            <span className="gantt-task-label">{t.name || '(무제)'}</span>
            {warnings.length > 0 && (
              <span className="warn-icon" title={warnings.join('\n')}>⚠️</span>
            )}
            <span className="fixed-start" title="시작일 고정: 지정하면 순차 계산 대신 이 날짜부터 시작해요">
              📌
              <input
                type="date"
                className={t.fixedStart ? 'pinned' : ''}
                value={t.fixedStart ?? ''}
                onChange={e => setFixedStart(t.id, e.target.value || undefined)}
              />
              {t.fixedStart && (
                <button className="btn-unpin" title="고정 해제" onClick={() => setFixedStart(t.id, undefined)}>✕</button>
              )}
            </span>
            <div className="gantt-task-days">
              {roles.filter(r => (t.days[r.id] || 0) > 0).map(r => (
                <span
                  key={r.id}
                  className="day-badge"
                  style={{ background: r.palette.badgeBg, color: r.palette.badgeText }}
                >
                  {r.name} {t.days[r.id]}일
                </span>
              ))}
            </div>
            <button className="btn-eject" onClick={() => ejectFromGantt(t.id)} title="보관함으로 꺼내기">↩</button>
          </div>
        )
      })}
    </div>
  )
}
