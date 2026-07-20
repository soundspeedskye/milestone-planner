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
  return [
    '## 1️⃣ 마일스톤',
    '',
    `- 프로젝트 시작일: ${data.startDate || '-'}`,
    `- 예상 종료일: ${data.projectEnd || '-'}`,
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
