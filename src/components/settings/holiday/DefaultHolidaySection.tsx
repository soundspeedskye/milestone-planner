import { DEFAULT_HOLIDAYS } from '../../../constants/holidays'
import { usePlannerStore } from '../../../store/usePlannerStore'
import { SettingsSection } from '../SettingsSection'
import { SettingsSubsection } from '../SettingsSubsection'

/** 기본 공휴일: 연도별 목록에서 체크 해제하면 영업일로 계산된다 */
export function DefaultHolidaySection() {
  const disabled = usePlannerStore((s) => s.holidays.disabled)
  const toggleDefaultHoliday = usePlannerStore((s) => s.toggleDefaultHoliday)

  const byYear = DEFAULT_HOLIDAYS.reduce<Record<string, string[]>>((acc, d) => {
    const y = d.slice(0, 4)
    ;(acc[y] ??= []).push(d)
    return acc
  }, {})
  const years = Object.keys(byYear).sort()
  const yearRange = years.length ? `${years[0]}~${years[years.length - 1]}` : ''

  return (
    <SettingsSection
      title={`기본 공휴일${yearRange ? ` (${yearRange})` : ''}`}
      description={<>기본 휴무일입니다.<br />체크를 해제하면 그 날은 영업일로 계산돼요.</>}
    >
      <SettingsSubsection>
        <div className="holiday-list">
          {Object.entries(byYear).map(([year, dates]) => (
            <div key={year}>
              <div className="holiday-year">{year}년</div>
              {dates.map((d) => {
                const off = disabled.includes(d)
                return (
                  <label className="holiday-item" key={d} style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={!off} onChange={() => toggleDefaultHoliday(d)} />
                    <span className={off ? 'off' : ''}>{d}</span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      </SettingsSubsection>
    </SettingsSection>
  )
}
