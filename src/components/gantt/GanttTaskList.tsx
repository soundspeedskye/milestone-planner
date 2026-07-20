import { useCallback, useState } from 'react'
import { GanttTaskItem } from './GanttTaskItem'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'
import { useSchedules } from '../../store/useScheduleStore'

/** 경고 없는 태스크가 매번 새 배열을 받지 않도록 고정 참조를 쓴다 */
const NO_WARNINGS: string[] = []

export function GanttTaskList() {
  const ganttTasks = usePlannerStore(s => s.ganttTasks)
  const roles = usePlannerStore(s => s.roles)
  const ganttIndex = useDragStore(s => s.ganttIndex)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const schedules = useSchedules()

  const handleOver = useCallback((i: number | null) => setOverIndex(i), [])

  if (ganttTasks.length === 0) return <div className="gantt-tasks" />

  return (
    <div className="gantt-tasks">
      {ganttTasks.map((t, i) => (
        <GanttTaskItem
          key={t.id}
          task={t}
          index={i}
          roles={roles}
          warnings={schedules.find(s => s.id === t.id)?.warnings ?? NO_WARNINGS}
          dragging={ganttIndex === i}
          over={overIndex === i}
          onOver={handleOver}
        />
      ))}
    </div>
  )
}
