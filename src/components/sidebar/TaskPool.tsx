import { usePlannerStore } from '../../store/usePlannerStore'
import { useDragStore } from '../../store/useDragStore'

export function TaskPool() {
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
    <div className="sidebar">
      <div className="sidebar-title">태스크 보관함</div>
      <div className="hint">
        태스크를 만들고 오른쪽 간트로 드래그하세요.<br />간트에서 다시 여기로 꺼낼 수도 있어요.
      </div>
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
            <div className="pool-task-name">
              <span style={{ color: '#ccc', fontSize: 13, cursor: 'grab' }}>⠿</span>
              <input
                placeholder="태스크명"
                value={t.name}
                onChange={e => updateTaskName(t.id, e.target.value)}
              />
              <button
                className="btn-remove btn-remove-icon tip tip-right tip-below"
                onClick={() => removePoolTask(t.id)}
                data-tooltip="태스크 삭제"
                aria-label="태스크 삭제"
              >
                ✕
              </button>
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
    </div>
  )
}
