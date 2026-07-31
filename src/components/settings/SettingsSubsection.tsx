import type { ReactNode } from 'react'

interface Props {
  label?: ReactNode
  children: ReactNode
}

/** 섹션 안의 세부 섹션: 소제목(선택) + 내용 */
export function SettingsSubsection({ label, children }: Props) {
  return (
    <div className="settings-subsection">
      {label && <div className="settings-subsection-label">{label}</div>}
      {children}
    </div>
  )
}
