import { useCallback, useState } from 'react'
import { GanttTaskItem } from './GanttTaskItem'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'

export function GanttTaskList() {
  const ganttTasks = usePlannerStore(s => s.ganttTasks)
  const roles = usePlannerStore(s => s.roles)
  const ganttIndex = useDragStore(s => s.ganttIndex)
  const [overIndex, setOverIndex] = useState<number | null>(null)

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
          dragging={ganttIndex === i}
          over={overIndex === i}
          onOver={handleOver}
        />
      ))}
    </div>
  )
}
