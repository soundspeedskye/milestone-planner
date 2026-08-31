import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLES, ROLE_PALETTES } from '../constants/roles'
import { usePlannerStore } from '../store/usePlannerStore'
import { useScheduleStore } from '../store/useScheduleStore'
import type { RoleSchedule, Task } from '../types'
import { calcSchedules } from './schedule'
import { TEST_HOLIDAYS } from './testHolidays'
import { addWD, buildHolidaySet, countWD, fmt, makeIsWorkday, parseDate, type IsWorkday } from './workdays'

const isWD = makeIsWorkday(buildHolidaySet({ custom: [], disabled: [] }, TEST_HOLIDAYS))

/**
 * calcSchedules와 동일한 규칙을 4개 기본 직군(기획→PD/BE→FE)에 하드코딩한 참조 구현.
 * inclusive 모델: 설정한 시작일(projectStart) 당일이 1일차이고, 직전/의존 종료일
 * 다음 영업일부터 이어서 센다.
 */
interface LegacyTask { id: number; name: string; 기획: number; PD: number; BE: number; FE: number }
type RefRole = RoleSchedule
function refCalc(tasks: LegacyTask[], projectStart: Date, wd: IsWorkday) {
  // roleEnd = 마지막으로 일한 날(inclusive). 시작 전날로 두면 첫날이 projectStart가 된다.
  const floor = new Date(projectStart); floor.setDate(floor.getDate() - 1)
  const roleEnd: Record<string, Date> = {
    기획: new Date(floor), PD: new Date(floor), BE: new Date(floor), FE: new Date(floor),
  }
  const startAfter = (boundary: Date) => addWD(boundary, 1, wd) // 경계일 다음 영업일 = 첫 작업일
  return tasks.map(t => {
    const s: { id: number; name: string; roles: Record<string, RefRole> } =
      { id: t.id, name: t.name || '(무제)', roles: {} }
    const 기Days = t.기획 || 0, PDd = t.PD || 0, BEd = t.BE || 0, FEd = t.FE || 0
    let 기End = new Date(roleEnd['기획'])
    if (기Days > 0) {
      const st = startAfter(roleEnd['기획'])
      기End = addWD(st, 기Days - 1, wd)
      s.roles['기획'] = { start: st, end: new Date(기End), days: 기Days }
      roleEnd['기획'] = new Date(기End)
    }
    if (PDd > 0) {
      const st = startAfter(new Date(Math.max(roleEnd['PD'].getTime(), 기End.getTime())))
      const en = addWD(st, PDd - 1, wd)
      s.roles['PD'] = { start: st, end: new Date(en), days: PDd }
      roleEnd['PD'] = new Date(en)
    }
    if (BEd > 0) {
      const st = startAfter(new Date(Math.max(roleEnd['BE'].getTime(), 기End.getTime())))
      const en = addWD(st, BEd - 1, wd)
      s.roles['BE'] = { start: st, end: new Date(en), days: BEd }
      roleEnd['BE'] = new Date(en)
    }
    const pdEnd = s.roles['PD'] ? s.roles['PD'].end : 기End
    if (FEd > 0) {
      const st = startAfter(new Date(Math.max(roleEnd['FE'].getTime(), pdEnd.getTime())))
      const en = addWD(st, FEd - 1, wd)
      s.roles['FE'] = { start: st, end: new Date(en), days: FEd }
      roleEnd['FE'] = new Date(en)
    }
    return s
  })
}

function toNewTask(t: LegacyTask): Task {
  return { id: t.id, name: t.name, days: { 기획: t.기획, PD: t.PD, BE: t.BE, FE: t.FE } }
}

/** 일정을 '시작~종료' 문자열로 */
function period(r: RoleSchedule) {
  return `${fmt(r.start)}~${fmt(r.end)}`
}

function normalize(s: { roles: Record<string, RefRole> }) {
  return Object.fromEntries(
    Object.entries(s.roles).map(([k, v]) => [k, { start: fmt(v.start), end: fmt(v.end), days: v.days }]),
  )
}

describe('calcSchedules — 참조 구현과의 동일성', () => {
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
      const ref = refCalc(tasks, start, isWD)
      const modern = calcSchedules(tasks.map(toNewTask), DEFAULT_ROLES, start, isWD)
      expect(modern.map(normalize)).toEqual(ref.map(normalize))
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
    // A: 월~화(20~21), B: A 종료 다음날부터 3일 → 22,23,24, C: B 다음 영업일 1일 → 27
    expect(fmt(s.roles['A'].end)).toBe('2026-07-21')
    expect(fmt(s.roles['B'].end)).toBe('2026-07-24')
    expect(fmt(s.roles['C'].end)).toBe('2026-07-27')
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

describe('고정일(앵커) 우선 배치', () => {
  const start = parseDate('2026-07-20') // 월

  it('앵커가 점유한 날에 걸리면 앞 태스크가 통째로 앵커 뒤로 밀린다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'T1', days: { 기획: 8 } },
      { id: 2, name: 'T2', days: { 기획: 2 }, fixedStart: '2026-07-22' },
      { id: 3, name: 'T3', days: { 기획: 1 } },
    ]
    const [t1, t2, t3] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    // 앵커는 지정한 날 그대로
    expect(period(t2.roles['기획'])).toBe('2026-07-22~2026-07-23')
    // T1은 7/20~21에 2일밖에 못 넣으므로 쪼개지 않고 앵커 뒤에서 8일을 연속으로 잡는다
    expect(period(t1.roles['기획'])).toBe('2026-07-24~2026-08-04')
    expect(t1.roles['기획'].days).toBe(8)
    // T3는 앞의 점유가 모두 끝난 다음 빈 날
    expect(period(t3.roles['기획'])).toBe('2026-08-05~2026-08-05')
  })

  it('앵커끼리 겹치면 지정일이 점유된 뒤 순서 앵커가 첫 빈 날로 밀린다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 5 }, fixedStart: '2026-07-20' },
      { id: 2, name: 'B', days: { 기획: 3 }, fixedStart: '2026-07-22' },
    ]
    const [a, b] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(period(a.roles['기획'])).toBe('2026-07-20~2026-07-24')
    expect(period(b.roles['기획'])).toBe('2026-07-27~2026-07-29')
  })

  it('앵커도 진행 중 다른 앵커에 부딪히면 쪼개지 않고 그 뒤 빈 자리로 간다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 2 }, fixedStart: '2026-07-23' },
      { id: 2, name: 'B', days: { 기획: 4 }, fixedStart: '2026-07-20' },
    ]
    const [a, b] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(period(a.roles['기획'])).toBe('2026-07-23~2026-07-24')
    // B는 7/20~22에 3일밖에 못 넣으므로 A 뒤에서 4일을 연속으로 잡는다
    expect(period(b.roles['기획'])).toBe('2026-07-27~2026-07-30')
  })

  it('고정일은 시작 직군에만 적용되고 뒤 직군은 자기 커서를 따른다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'T1', days: { 기획: 2, BE: 5 } },
      // 목록 뒤에 있지만 기획은 고정일을 지킨다. BE는 T1 뒤에 붙는다.
      { id: 2, name: 'T2', days: { 기획: 1, BE: 2 }, fixedStart: '2026-07-20' },
    ]
    const [t1, t2] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(period(t2.roles['기획'])).toBe('2026-07-20~2026-07-20')
    // T1 기획은 앵커가 쓴 7/20을 피해 7/21부터
    expect(period(t1.roles['기획'])).toBe('2026-07-21~2026-07-22')
    // T1 BE가 먼저(7/23~7/29), T2 BE는 그 뒤 — 고정일 7/20으로 당겨지지 않는다
    expect(period(t1.roles['BE'])).toBe('2026-07-23~2026-07-29')
    expect(period(t2.roles['BE'])).toBe('2026-07-30~2026-07-31')
  })

  it('시작 직군은 소요일이 있는 첫 직군이다 (기획이 0일이면 BE가 고정일을 받는다)', () => {
    const tasks: Task[] = [
      { id: 1, name: 'T1', days: { BE: 3 } },
      { id: 2, name: 'T2', days: { BE: 2 }, fixedStart: '2026-07-20' },
    ]
    const [t1, t2] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(period(t2.roles['BE'])).toBe('2026-07-20~2026-07-21')
    expect(period(t1.roles['BE'])).toBe('2026-07-22~2026-07-24')
  })

  it('막대는 어떤 경우에도 쪼개지지 않는다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 8, PD: 2 } },
      { id: 2, name: 'B', days: { 기획: 2 }, fixedStart: '2026-07-22' },
      { id: 3, name: 'C', days: { 기획: 4, PD: 3 } },
    ]
    const schedules = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    schedules.forEach(s =>
      Object.values(s.roles).forEach(r =>
        // 시작~종료 사이 영업일 수가 소요일과 같으면 중간에 빈 구간이 없다는 뜻
        expect(countWD(r.start, r.end, isWD) + 1).toBe(r.days),
      ),
    )
  })
})

describe('직군 휴무(연차)는 일정 계산에 영향을 주지 않는다', () => {
  it('연차를 추가해도 종료일은 그대로이고 roleOffSet에만 반영된다', () => {
    usePlannerStore.getState().loadProject({
      startDate: '2026-07-20',
      poolTasks: [],
      ganttTasks: [{ id: 1, name: 'A', days: { 기획: 3, BE: 3 } }],
      roles: DEFAULT_ROLES,
      holidays: { custom: [], disabled: [], byRole: {} },
    })

    const before = useScheduleStore.getState().schedules[0].roles
    const 기End = fmt(before['기획'].end)
    const beEnd = fmt(before['BE'].end)

    // 기획 막대(20~22) 한가운데 07-22에 연차를 넣는다
    usePlannerStore.getState().addRoleHoliday('기획', '2026-07-22')
    const after = useScheduleStore.getState()

    // 종료일은 밀리지 않는다 (연차는 표기 전용)
    expect(fmt(after.schedules[0].roles['기획'].end)).toBe(기End)
    expect(fmt(after.schedules[0].roles['BE'].end)).toBe(beEnd)
    // 표기용 roleOffSet에만 들어간다
    expect(after.roleOffSet['기획']?.has('2026-07-22')).toBe(true)
  })
})
