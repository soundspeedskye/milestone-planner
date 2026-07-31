import type { ReactNode } from 'react'

interface Props {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}

/** 설정 모달의 한 섹션: 제목 + 설명 + (아래) 세부 섹션들 */
export function SettingsSection({ title, description, children }: Props) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h3 className="settings-section-title">{title}</h3>
        {description && <div className="settings-section-desc">{description}</div>}
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  )
}
