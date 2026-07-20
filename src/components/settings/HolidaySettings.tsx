import { useState } from 'react'
import { DEFAULT_HOLIDAYS } from '../../constants/holidays'
import { usePlannerStore } from '../../store/usePlannerStore'

export function HolidaySettings() {
  const holidays = usePlannerStore(s => s.holidays)
  const addCustomHoliday = usePlannerStore(s => s.addCustomHoliday)
  const removeCustomHoliday = usePlannerStore(s => s.removeCustomHoliday)
  const toggleDefaultHoliday = usePlannerStore(s => s.toggleDefaultHoliday)
  const [newDate, setNewDate] = useState('')

  const byYear = DEFAULT_HOLIDAYS.reduce<Record<string, string[]>>((acc, d) => {
    const y = d.slice(0, 4)
    ;(acc[y] ??= []).push(d)
    return acc
  }, {})
  const years = Object.keys(byYear).sort()
  const yearRange = years.length ? `${years[0]}~${years[years.length - 1]}` : ''

  return (
    <>
      <div className="settings-section-title">커스텀 휴무일</div>
      <div className="modal-hint">회사 창립일, 전사 휴가 등 공휴일 외 휴무일을 추가하면 일정 계산에서 제외돼요.</div>
      <div className="holiday-add">
        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
        <button
          className="btn-save"
          onClick={() => {
            if (!newDate) return
            addCustomHoliday(newDate)
            setNewDate('')
          }}
        >
          추가
        </button>
      </div>
      {holidays.custom.length > 0 && (
        <div className="holiday-list">
          {holidays.custom.map(d => (
            <div className="holiday-item" key={d}>
              <span style={{ flex: 1 }}>{d}</span>
              <button className="btn-remove" onClick={() => removeCustomHoliday(d)}>✕ 삭제</button>
            </div>
          ))}
        </div>
      )}

      <div className="settings-section-title" style={{ marginTop: 8 }}>기본 공휴일 ({yearRange})</div>
      <div className="modal-hint">공공데이터포털 기준 공휴일이에요. 체크를 해제하면 그 날은 영업일로 계산돼요.</div>
      <div className="holiday-list">
        {Object.entries(byYear).map(([year, dates]) => (
          <div key={year}>
            <div className="holiday-year">{year}년</div>
            {dates.map(d => {
              const disabled = holidays.disabled.includes(d)
              return (
                <label className="holiday-item" key={d} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={!disabled} onChange={() => toggleDefaultHoliday(d)} />
                  <span className={disabled ? 'off' : ''}>{d}</span>
                </label>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
