import type { RoleDef, RolePalette } from '../types'

/** 직군 색상 프리셋. 앞 4개는 기존 기획/PD/BE/FE 색상 그대로 */
export const ROLE_PALETTES: RolePalette[] = [
  { header: '#378ADD', bar: '#B5D4F4', barText: '#0C447C', badgeBg: '#E6F1FB', badgeText: '#0C447C' },
  { header: '#1D9E75', bar: '#9FE1CB', barText: '#085041', badgeBg: '#E1F5EE', badgeText: '#085041' },
  { header: '#BA7517', bar: '#FAC775', barText: '#633806', badgeBg: '#FAEEDA', badgeText: '#633806' },
  { header: '#D4537E', bar: '#F4C0D1', barText: '#72243E', badgeBg: '#FBEAF0', badgeText: '#72243E' },
  { header: '#7C5CD4', bar: '#CCC0F0', barText: '#3A2A73', badgeBg: '#EFEAFB', badgeText: '#3A2A73' },
  { header: '#1D8F9E', bar: '#A0DDE4', barText: '#0A4A52', badgeBg: '#E2F4F6', badgeText: '#0A4A52' },
  { header: '#D45353', bar: '#F4C0C0', barText: '#732424', badgeBg: '#FBEAEA', badgeText: '#732424' },
  { header: '#6B6B66', bar: '#D4D4CC', barText: '#33332E', badgeBg: '#EFEFEA', badgeText: '#33332E' },
]

/** 기본 직군 구성. 의존 체인은 기존 로직과 동일: PD/BE는 기획 이후, FE는 PD 이후 */
export const DEFAULT_ROLES: RoleDef[] = [
  { id: '기획', name: '기획', palette: ROLE_PALETTES[0], dependsOn: [] },
  { id: 'PD', name: 'PD', palette: ROLE_PALETTES[1], dependsOn: ['기획'] },
  { id: 'BE', name: 'BE', palette: ROLE_PALETTES[2], dependsOn: ['기획'] },
  { id: 'FE', name: 'FE', palette: ROLE_PALETTES[3], dependsOn: ['PD'] },
]
