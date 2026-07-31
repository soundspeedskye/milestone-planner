import { useState } from 'react'
import { fmt } from '../../lib/workdays'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'
import { useSchedules } from '../../store/useScheduleStore'

export function DropZone() {
  const [over, setOver] = useState(false)
  const moveToGantt = usePlannerStore(s => s.moveToGantt)
  const schedules = useSchedules()

  const nextStartDate = () => {
    const lastSchedule = [...schedules]
      .reverse()
      .find(schedule => Object.keys(schedule.roles).length > 0)
    const planningEnd = lastSchedule?.roles['기획']?.end
    return planningEnd ? fmt(planningEnd) : undefined
  }

  return (
    <div
      className={`drop-zone ${over ? 'over' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const { poolId, setPoolId } = useDragStore.getState()
        if (e.dataTransfer.getData('source') === 'pool' && poolId !== null) {
          moveToGantt(poolId, nextStartDate())
          setPoolId(null)
        }
      }}
    >
      ← 보관함에서 태스크를 여기로 드래그하면 일정에 추가돼요
    </div>
  )
}
