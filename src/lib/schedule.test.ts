import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLES, ROLE_PALETTES } from '../constants/roles'
import type { RoleSchedule, Task } from '../types'
import { calcSchedules } from './schedule'
import { TEST_HOLIDAYS } from './testHolidays'
import { addWD, buildHolidaySet, fmt, makeIsWorkday, parseDate, type IsWorkday } from './workdays'

const isWD = makeIsWorkday(buildHolidaySet({ custom: [], disabled: [] }, TEST_HOLIDAYS))

/** 레거시 HTML의 calcSchedules를 그대로 포팅한 참조 구현 (기획→PD/BE→FE 하드코딩) */
interface LegacyTask { id: number; name: string; 기획: number; PD: number; BE: number; FE: number }
function legacyCalc(tasks: LegacyTask[], projectStart: Date, wd: IsWorkday) {
  const roleEnd: Record<string, Date> = {
    기획: new Date(projectStart), PD: new Date(projectStart),
    BE: new Date(projectStart), FE: new Date(projectStart),
  }
  return tasks.map(t => {
    const s: { id: number; name: string; roles: Record<string, RoleSchedule> } =
      { id: t.id, name: t.name || '(무제)', roles: {} }
    const 기Days = t.기획 || 0, PDd = t.PD || 0, BEd = t.BE || 0, FEd = t.FE || 0
    let 기End = new Date(roleEnd['기획'])
    if (기Days > 0) {
      const st = new Date(roleEnd['기획'])
      기End = addWD(st, 기Days, wd)
      s.roles['기획'] = { start: st, end: new Date(기End), days: 기Days }
      roleEnd['기획'] = new Date(기End)
    }
    if (PDd > 0) {
      const sb = new Date(Math.max(roleEnd['PD'].getTime(), 기End.getTime()))
      const en = addWD(sb, PDd, wd)
      s.roles['PD'] = { start: sb, end: new Date(en), days: PDd }
      roleEnd['PD'] = new Date(en)
    }
    if (BEd > 0) {
      const sb = new Date(Math.max(roleEnd['BE'].getTime(), 기End.getTime()))
      const en = addWD(sb, BEd, wd)
      s.roles['BE'] = { start: sb, end: new Date(en), days: BEd }
      roleEnd['BE'] = new Date(en)
    }
    const pdEnd = s.roles['PD'] ? s.roles['PD'].end : 기End
    if (FEd > 0) {
      const sb = new Date(Math.max(roleEnd['FE'].getTime(), pdEnd.getTime()))
      const en = addWD(sb, FEd, wd)
      s.roles['FE'] = { start: sb, end: new Date(en), days: FEd }
      roleEnd['FE'] = new Date(en)
    }
    return s
  })
}

function toNewTask(t: LegacyTask): Task {
  return { id: t.id, name: t.name, days: { 기획: t.기획, PD: t.PD, BE: t.BE, FE: t.FE } }
}

function normalize(s: { roles: Record<string, RoleSchedule> }) {
  return Object.fromEntries(
    Object.entries(s.roles).map(([k, v]) => [k, { start: fmt(v.start), end: fmt(v.end), days: v.days }]),
  )
}

describe('calcSchedules — 레거시 로직과의 동일성', () => {
  const scenarios: { name: string; tasks: LegacyTask[] }[] = [
    {
      name: '전 직군 소요일이 있는 태스크 2개',
      tasks: [
        { id: 1, name: 'A', 기획: 3, PD: 2, BE: 5, FE: 4 },
        { id: 2, name: 'B', 기획: 2, PD: 3, BE: 2, FE: 3 },
      ],
    },
    {
      name: 'PD가 없는 태스크 (FE가 기획 종료로 폴백)',
      tasks: [{ id: 1, name: 'A', 기획: 3, PD: 0, BE: 2, FE: 4 }],
    },
    {
      name: '기획이 없는 태스크',
      tasks: [{ id: 1, name: 'A', 기획: 0, PD: 2, BE: 3, FE: 2 }],
    },
    {
      name: 'FE만 있는 태스크가 중간에 낀 3개',
      tasks: [
        { id: 1, name: 'A', 기획: 5, PD: 3, BE: 0, FE: 0 },
        { id: 2, name: 'B', 기획: 0, PD: 0, BE: 0, FE: 4 },
        { id: 3, name: 'C', 기획: 2, PD: 2, BE: 2, FE: 2 },
      ],
    },
    {
      name: '공휴일 구간(2026 추석)을 걸치는 일정',
      tasks: [{ id: 1, name: 'A', 기획: 10, PD: 10, BE: 10, FE: 10 }],
    },
  ]

  scenarios.forEach(({ name, tasks }) => {
    it(name, () => {
      const start = parseDate('2026-09-14')
      const legacy = legacyCalc(tasks, start, isWD)
      const modern = calcSchedules(tasks.map(toNewTask), DEFAULT_ROLES, start, isWD)
      expect(modern.map(normalize)).toEqual(legacy.map(normalize))
    })
  })
})

describe('calcSchedules — 신규 기능', () => {
  it('커스텀 직군 의존 체인을 따른다', () => {
    const roles = [
      { id: 'A', name: 'A', palette: ROLE_PALETTES[0], dependsOn: [] },
      { id: 'B', name: 'B', palette: ROLE_PALETTES[1], dependsOn: ['A'] },
      { id: 'C', name: 'C', palette: ROLE_PALETTES[2], dependsOn: ['B'] },
    ]
    const [s] = calcSchedules(
      [{ id: 1, name: 't', days: { A: 2, B: 3, C: 1 } }],
      roles, parseDate('2026-07-20'), isWD,
    )
    // A: 화~수(21~22), B: 22 이후 3일 → 23,24,27, C: 27 이후 1일 → 28
    expect(fmt(s.roles['A'].end)).toBe('2026-07-22')
    expect(fmt(s.roles['B'].end)).toBe('2026-07-27')
    expect(fmt(s.roles['C'].end)).toBe('2026-07-28')
  })

  it('의존 순환이 있어도 무한루프 없이 계산된다', () => {
    const roles = [
      { id: 'A', name: 'A', palette: ROLE_PALETTES[0], dependsOn: ['B'] },
      { id: 'B', name: 'B', palette: ROLE_PALETTES[1], dependsOn: ['A'] },
    ]
    const [s] = calcSchedules(
      [{ id: 1, name: 't', days: { A: 2, B: 2 } }],
      roles, parseDate('2026-07-20'), isWD,
    )
    expect(Object.keys(s.roles)).toHaveLength(2)
  })

  it('fixedStart가 있으면 그 날짜부터 시작한다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 3 } },
      { id: 2, name: 'B', days: { 기획: 2 }, fixedStart: '2026-08-03' },
    ]
    const [, b] = calcSchedules(tasks, DEFAULT_ROLES, parseDate('2026-07-20'), isWD)
    expect(fmt(b.roles['기획'].start)).toBe('2026-08-03')
    expect(b.warnings).toHaveLength(0)
  })

  it('fixedStart가 앞 일정과 겹치면 경고를 남긴다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 10 } },
      { id: 2, name: 'B', days: { 기획: 2 }, fixedStart: '2026-07-22' },
    ]
    const [, b] = calcSchedules(tasks, DEFAULT_ROLES, parseDate('2026-07-20'), isWD)
    expect(fmt(b.roles['기획'].start)).toBe('2026-07-22')
    expect(b.warnings.length).toBeGreaterThan(0)
  })

  it('fixedStart여도 태스크 내부 직군 의존은 지킨다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 3, PD: 2 }, fixedStart: '2026-07-20' },
    ]
    const [s] = calcSchedules(tasks, DEFAULT_ROLES, parseDate('2026-07-20'), isWD)
    // PD는 고정일이 아니라 기획 종료(7/23) 이후 시작
    expect(fmt(s.roles['PD'].start)).toBe('2026-07-23')
  })
})
