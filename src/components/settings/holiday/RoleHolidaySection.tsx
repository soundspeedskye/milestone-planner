import { useState } from 'react'
import { usePlannerStore } from '../../../store/usePlannerStore'
import { DateField } from '../../common/DateField'
import { SettingsSection } from '../SettingsSection'
import { SettingsSubsection } from '../SettingsSubsection'

/** 직군별 휴무일: 특정 직군만 쉬는 날 */
export function RoleHolidaySection() {
  const roles = usePlannerStore((s) => s.roles)
  const byRole = usePlannerStore((s) => s.holidays.byRole)
  const addRoleHoliday = usePlannerStore((s) => s.addRoleHoliday)
  const removeRoleHoliday = usePlannerStore((s) => s.removeRoleHoliday)
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [roleDate, setRoleDate] = useState('')

  // 직군이 삭제되면 없는 직군을 가리킬 수 있어 첫 직군으로 되돌린다
  const selectedRole = roles.some((r) => r.id === roleId) ? roleId : (roles[0]?.id ?? '')
  const roleEntries = roles
    .map((r) => ({ role: r, dates: byRole[r.id] ?? [] }))
    .filter((e) => e.dates.length > 0)

  const add = () => {
    if (!roleDate || !selectedRole) return
    addRoleHoliday(selectedRole, roleDate)
    setRoleDate('')
  }

  return (
    <SettingsSection
      title="직군별 휴무일"
      description="특정 직군만 쉬는 날을 추가할 수 있습니다."
    >
      {roles.length === 0 ? (
        <div className="holiday-empty">직군을 먼저 추가해 주세요.</div>
      ) : (
        <>
          <SettingsSubsection>
            <div className="holiday-add role-holiday-add">
              <select
                value={selectedRole}
                onChange={(e) => setRoleId(e.target.value)}
                aria-label="휴무일을 적용할 직군"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <DateField
                value={roleDate || undefined}
                onChange={(v) => setRoleDate(v ?? '')}
                placeholder="휴무일 선택"
                aria-label="직군 휴무일"
              />
              <button className="btn-save" onClick={add}>추가</button>
            </div>
          </SettingsSubsection>

          <SettingsSubsection>
            {roleEntries.length > 0 ? (
              <div className="holiday-list">
                {roleEntries.map(({ role, dates }) => (
                  <div key={role.id}>
                    <div className="holiday-year" style={{ color: role.palette.header }}>
                      {role.name}
                    </div>
                    {dates.map((d) => (
                      <div className="holiday-item" key={d}>
                        <span style={{ flex: 1 }}>{d}</span>
                        <button
                          className="btn-remove btn-remove-icon"
                          onClick={() => removeRoleHoliday(role.id, d)}
                          aria-label={`${role.name} ${d} 휴무일 삭제`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="holiday-empty">직군별 휴무일이 없어요.</div>
            )}
          </SettingsSubsection>
        </>
      )}
    </SettingsSection>
  )
}
