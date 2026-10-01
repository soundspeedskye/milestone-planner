import { memo, useState } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'
import { TaskEditModal } from './TaskEditModal'
import { PinIcon, PencilIcon, EjectIcon } from '../icons/AppIcons'
import { DateField } from '../common/DateField'
import type { RoleDef } from '../../types'

interface Props {
  id: number
  /** ganttTasks 안에서의 위치. 드래그 재정렬 기준이 된다 */
  index: number
  rowSpan: number
  roles: RoleDef[]
  readonly: boolean
  dragging: boolean
}

function GripIcon() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" />
      <circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" />
      <circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" />
    </svg>
  )
}

/**
 * 간트 표 왼쪽의 태스크 셀. 예전 간트 태스크 목록(GanttTaskItem)이 하던 일을
 * 그대로 가져왔다: 드래그 재정렬 · 시작일 고정 · 수정 · 보관함으로 꺼내기.
 *
 * 태스크 하나만 구독해서, 다른 태스크를 고쳐도 이 셀은 다시 그리지 않는다.
 */
export const GanttTaskCell = memo(function GanttTaskCell({
  id, index, rowSpan, roles, readonly, dragging,
}: Props) {
  const task = usePlannerStore(s => s.ganttTasks.find(t => t.id === id))
  const ejectFromGantt = usePlannerStore(s => s.ejectFromGantt)
  const setFixedStart = usePlannerStore(s => s.setFixedStart)
  const setGanttIndex = useDragStore(s => s.setGanttIndex)
  const [editing, setEditing] = useState(false)

  // 놓을 자리(태스크 사이 경계)는 GanttChart가 표 본문 전체에서 data-gantt-task로 찾는다.
  if (!task) return <td className="g-task-label" rowSpan={rowSpan} data-gantt-task={index} />

  return (
    <td
      className="g-task-label"
      rowSpan={rowSpan}
      style={{ verticalAlign: 'middle' }}
      data-gantt-task={index}
    >
      <div className={`g-task-cell ${dragging ? 'dragging' : ''}`}>
        <div className="gtc-top">
          {!readonly && (
            <span
              className="drag-handle-gantt"
              draggable
              onDragStart={e => {
                setGanttIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('source', 'gantt')
              }}
              onDragEnd={() => setGanttIndex(null)}
              aria-label={`${task.name || '무제'} 태스크 순서 변경`}
            >
              <GripIcon />
            </span>
          )}
          <span className="gantt-task-label">{task.name || '(무제)'}</span>
          {!readonly && (
            <span className="gtc-actions">
              <button
                className="btn-edit-task tip tip-right"
                onClick={() => setEditing(true)}
                data-tooltip="태스크 수정"
                aria-label={`${task.name || '무제'} 태스크 수정`}
              >
                <PencilIcon size={14} />
              </button>
              <button
                className="btn-eject tip tip-right"
                onClick={() => ejectFromGantt(task.id)}
                data-tooltip="보관함으로 꺼내기"
                aria-label={`${task.name || '무제'} 보관함으로 꺼내기`}
              >
                <EjectIcon size={14} />
              </button>
            </span>
          )}
        </div>

        {!readonly && (
          <span className="fixed-start">
            <span
              className="tip pin-icon"
              data-tooltip="시작일 고정"
              tabIndex={0}
              role="img"
              aria-label="시작일 고정: 지정하면 순차 계산 대신 이 날짜부터 시작해요"
            >
              <PinIcon size={14} />
            </span>
            <DateField
              className={task.fixedStart ? 'pinned' : ''}
              value={task.fixedStart ?? undefined}
              onChange={v => setFixedStart(task.id, v)}
              placeholder="시작일 고정"
              clearable
              aria-label="시작일 고정"
            />
          </span>
        )}
      </div>

      {editing && (
        <TaskEditModal task={task} roles={roles} onClose={() => setEditing(false)} />
      )}
    </td>
  )
})
