import { ROLE_PALETTES } from '../../constants/roles'
import { usePlannerStore } from '../../store/usePlannerStore'

export function RoleSettings() {
  const roles = usePlannerStore(s => s.roles)
  const addRole = usePlannerStore(s => s.addRole)
  const removeRole = usePlannerStore(s => s.removeRole)
  const renameRole = usePlannerStore(s => s.renameRole)
  const setRolePalette = usePlannerStore(s => s.setRolePalette)
  const toggleRoleDep = usePlannerStore(s => s.toggleRoleDep)
  const moveRole = usePlannerStore(s => s.moveRole)

  const handleRemove = (id: string, name: string) => {
    if (!confirm(`'${name}' 직군을 삭제할까요? 태스크에 입력된 이 직군의 소요일은 화면에서 사라져요.`)) return
    removeRole(id)
  }

  return (
    <>
      <div className="modal-hint">
        직군 이름·색상·순서를 바꾸고, "이후 시작" 체크로 직군 간 선후 관계를 정할 수 있어요.<br />
        기본 구성: PD·BE는 기획이 끝난 뒤, FE는 PD가 끝난 뒤 시작합니다.
      </div>
      {roles.map((role, i) => (
        <div className="role-edit-row" key={role.id}>
          <div className="role-edit-top">
            <input
              type="text"
              value={role.name}
              onChange={e => renameRole(role.id, e.target.value)}
              placeholder="직군명"
            />
            <button className="btn-icon" disabled={i === 0} onClick={() => moveRole(role.id, -1)} title="위로">▲</button>
            <button className="btn-icon" disabled={i === roles.length - 1} onClick={() => moveRole(role.id, 1)} title="아래로">▼</button>
            <button className="btn-icon danger" onClick={() => handleRemove(role.id, role.name)} title="직군 삭제">✕</button>
          </div>
          <div className="palette-row">
            {ROLE_PALETTES.map((p, pi) => (
              <button
                key={pi}
                className={`palette-swatch ${role.palette.header === p.header ? 'selected' : ''}`}
                style={{ background: p.bar }}
                onClick={() => setRolePalette(role.id, p)}
                title="색상 선택"
              />
            ))}
          </div>
          <div className="dep-row">
            <span className="dep-label">이후 시작:</span>
            {roles.filter(r => r.id !== role.id).map(r => (
              <label className="dep-check" key={r.id}>
                <input
                  type="checkbox"
                  checked={role.dependsOn.includes(r.id)}
                  onChange={() => toggleRoleDep(role.id, r.id)}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn-add-task" onClick={addRole}>＋ 직군 추가</button>
    </>
  )
}
