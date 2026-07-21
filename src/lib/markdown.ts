import type { RoleDef } from '../types'
import type { MilestoneSnapshot } from './snapshot'

export function buildMeetingMarkdown(data: MilestoneSnapshot, roles: RoleDef[]): string {
  const rows: string[] = []
  data.tasks.forEach(task => {
    roles.forEach(role => {
      const item = task.roles[role.id]
      if (!item) return
      rows.push(`| ${role.name} | [${(task.name || '(무제)').replaceAll('|', '\\|')}] | ${item.start} ~ ${item.end} | ${item.days}일 |`)
    })
  })
  // 일정에서 빠진 날은 회의에서 자주 나오는 질문이라 표 위에 함께 적는다
  const roleName = new Map(roles.map(r => [r.id, r.name]))
  const offLines: string[] = []
  if (data.holidays.custom.length) {
    offLines.push(`- 휴무일: ${data.holidays.custom.join(', ')}`)
  }
  Object.entries(data.holidays.byRole).forEach(([id, dates]) => {
    if (dates.length) offLines.push(`- ${roleName.get(id) ?? id} 휴무: ${dates.join(', ')}`)
  })

  return [
    '## 1️⃣ 마일스톤',
    '',
    `- 프로젝트 시작일: ${data.startDate || '-'}`,
    `- 예상 종료일: ${data.projectEnd || '-'}`,
    ...offLines,
    '',
    '| 담당 | 내용 | 진행일 | 소요일 |',
    '| --- | --- | --- | ---: |',
    rows.length ? rows.join('\n') : '|  | 표시할 마일스톤 없음 |  |  |',
  ].join('\n')
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}
