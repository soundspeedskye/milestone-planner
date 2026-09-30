import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'

interface TaskPoolProps {
  collapsed: boolean
  compact: boolean
  onToggle: () => void
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

export function TaskPool({ collapsed, compact, onToggle }: TaskPoolProps) {
  const poolTasks = usePlannerStore(s => s.poolTasks)
  const roles = usePlannerStore(s => s.roles)
  const addPoolTask = usePlannerStore(s => s.addPoolTask)
  const removePoolTask = usePlannerStore(s => s.removePoolTask)
  const updateTaskName = usePlannerStore(s => s.updateTaskName)
  const updateTaskDays = usePlannerStore(s => s.updateTaskDays)
  // 필요한 값만 골라 구독한다 (스토어 전체를 구독하면 간트 드래그에도 리렌더된다)
  const poolId = useDragStore(s => s.poolId)
  const setPoolId = useDragStore(s => s.setPoolId)

  return (
    <aside
      id="task-pool"
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-open'}${compact ? ' sidebar-compact-panel' : ''}`}
      aria-hidden={collapsed || undefined}
    >
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <div className="sidebar-title">태스크 보관함</div>
            <button
              className="sidebar-toggle"
              onClick={onToggle}
              aria-expanded
              aria-controls="task-pool-content"
              aria-label="태스크 보관함 접기"
              title="태스크 보관함 접기"
            >
              <span aria-hidden="true">‹</span>
            </button>
          </div>

          <div id="task-pool-content" className="sidebar-content">
            <div className="pool-list">
              {poolTasks.map(t => (
                <div
                  key={t.id}
                  className={`pool-task ${poolId === t.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={e => {
                    setPoolId(t.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('source', 'pool')
                  }}
                  onDragEnd={() => setPoolId(null)}
                >
                  <div className="pool-task-meta">
                    <span style={{ display: 'inline-flex', color: '#cfcfc8', cursor: 'grab' }}><GripIcon /></span>
                    <span className="pool-task-kind">보관함</span>
                    <button
                      className="btn-remove btn-remove-icon tip tip-right tip-below"
                      onClick={() => removePoolTask(t.id)}
                      data-tooltip="태스크 삭제"
                      aria-label="태스크 삭제"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="pool-task-name">
                    <input
                      placeholder="태스크명"
                      value={t.name}
                      onChange={e => updateTaskName(t.id, e.target.value)}
                    />
                  </div>
                  <div className="day-grid">
                    {roles.map(r => (
                      <div className="day-field" key={r.id}>
                        <label style={{ color: r.palette.header }} htmlFor={`pool-${t.id}-${r.id}`}>{r.name}</label>
                        <input
                          id={`pool-${t.id}-${r.id}`}
                          type="number"
                          min={0}
                          step={1}
                          placeholder="0"
                          value={t.days[r.id] || ''}
                          onChange={e => updateTaskDays(t.id, r.id, parseInt(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-add-task" onClick={addPoolTask}>＋ 태스크 추가</button>
            <div className="hint">
              카드를 오른쪽 간트로 끌어다 놓으면 일정이 자동으로 계산돼요.<br />간트에서 다시 여기로 꺼낼 수도 있어요.
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
