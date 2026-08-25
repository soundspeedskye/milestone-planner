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
    // 고정일 태스크 때문에 간트 목록 순서가 시간 순서와 어긋날 수 있어
    // 목록의 마지막이 아니라 가장 늦은 기획 종료일을 기준으로 잡는다.
    const ends = schedules
      .map(schedule => schedule.roles['기획']?.end)
      .filter((end): end is Date => !!end)
    if (ends.length === 0) return undefined
    return fmt(new Date(Math.max(...ends.map(end => end.getTime()))))
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
