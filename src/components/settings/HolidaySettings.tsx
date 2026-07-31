import { DefaultHolidaySection } from './holiday/DefaultHolidaySection'
import { CustomHolidaySection } from './holiday/CustomHolidaySection'
import { RoleHolidaySection } from './holiday/RoleHolidaySection'

/** 휴무일 탭: 기본 공휴일 · 전사 휴무일 · 직군별 휴무일 세 섹션을 배치한다 */
export function HolidaySettings() {
  return (
    <div className="settings-sections">
      <DefaultHolidaySection />
      <CustomHolidaySection />
      <RoleHolidaySection />
    </div>
  )
}
