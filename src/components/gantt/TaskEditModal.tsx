import { useEffect, useState } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { PencilIcon } from '../icons/AppIcons'
import type { RoleDef, Task } from '../../types'

interface Props {
  task: Task
  roles: RoleDef[]
  onClose: () => void
}

/**
 * 간트 목록의 태스크를 이름·직군별 일수만 수정하는 모달.
 * 보관함 카드(pool-task) 스타일을 재사용하되, 스토어에 바로 쓰지 않고
 * 로컬 드래프트에 담았다가 '저장'을 눌러야 커밋한다(취소하면 버린다).
 */
export function TaskEditModal({ task, roles, onClose }: Props) {
  const updateTaskName = usePlannerStore(s => s.updateTaskName)
  const updateTaskDays = usePlannerStore(s => s.updateTaskDays)

  const [name, setName] = useState(task.name)
  const [days, setDays] = useState<Record<string, number>>({ ...task.days })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    updateTaskName(task.id, name)
    for (const r of roles) {
      updateTaskDays(task.id, r.id, days[r.id] || 0)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-task-edit">
        <div className="modal-header">
          <h2><PencilIcon size={28} /> 태스크 수정</h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="pool-task" style={{ cursor: 'default' }}>
            <div className="pool-task-name">
              <input
                placeholder="태스크명"
                value={name}
                autoFocus
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="day-grid">
              {roles.map(r => (
                <div className="day-field" key={r.id}>
                  <label style={{ color: r.palette.header }}>{r.name}</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={days[r.id] || ''}
                    onChange={e =>
                      setDays(d => ({ ...d, [r.id]: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-reset" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  )
}
