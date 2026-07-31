import { useState } from 'react'
import { usePlannerStore } from '../../../store/usePlannerStore'
import { DateField } from '../../common/DateField'
import { SettingsSection } from '../SettingsSection'
import { SettingsSubsection } from '../SettingsSubsection'

/** 전사 휴무일: 법정 휴일 외 직접 추가하는 휴무일 */
export function CustomHolidaySection() {
  const custom = usePlannerStore((s) => s.holidays.custom)
  const addCustomHoliday = usePlannerStore((s) => s.addCustomHoliday)
  const removeCustomHoliday = usePlannerStore((s) => s.removeCustomHoliday)
  const [newDate, setNewDate] = useState('')

  const add = () => {
    if (!newDate) return
    addCustomHoliday(newDate)
    setNewDate('')
  }

  return (
    <SettingsSection
      title="휴무일 설정"
      description="법정 휴일 외 휴무일을 직접 추가할 수 있습니다."
    >
      <SettingsSubsection>
        <div className="holiday-add">
          <DateField
            value={newDate || undefined}
            onChange={(v) => setNewDate(v ?? '')}
            placeholder="휴무일 선택"
            aria-label="추가할 휴무일"
          />
          <button className="btn-save" onClick={add}>추가</button>
        </div>
      </SettingsSubsection>

      <SettingsSubsection>
        {custom.length > 0 ? (
          <div className="holiday-list">
            {custom.map((d) => (
              <div className="holiday-item" key={d}>
                <span style={{ flex: 1 }}>{d}</span>
                <button
                  className="btn-remove btn-remove-icon"
                  onClick={() => removeCustomHoliday(d)}
                  aria-label={`${d} 휴무일 삭제`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="holiday-empty">직접 추가한 휴무일이 없어요.</div>
        )}
      </SettingsSubsection>
    </SettingsSection>
  )
}
