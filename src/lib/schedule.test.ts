import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLES, ROLE_PALETTES } from '../constants/roles'
import { usePlannerStore } from '../store/usePlannerStore'
import { useScheduleStore } from '../store/useScheduleStore'
import type { RoleSchedule, Task } from '../types'
import { calcSchedules } from './schedule'
import { TEST_HOLIDAYS } from './testHolidays'
import { addWD, buildHolidaySet, fmt, makeIsWorkday, parseDate, type IsWorkday } from './workdays'

const isWD = makeIsWorkday(buildHolidaySet({ custom: [], disabled: [] }, TEST_HOLIDAYS))

/**
 * calcSchedules와 동일한 규칙을 4개 기본 직군(기획→PD/BE→FE)에 하드코딩한 참조 구현.
 * inclusive 모델: 설정한 시작일(projectStart) 당일이 1일차이고, 직전/의존 종료일
 * 다음 영업일부터 이어서 센다.
 */
interface LegacyTask { id: number; name: string; 기획: number; PD: number; BE: number; FE: number }
/** 참조 구현은 막대가 쪼개질 일이 없으므로 segments 없이 만든다 */
type RefRole = Omit<RoleSchedule, 'segments'>
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

/** 토막들을 '시작~종료' 문자열로 (연속이면 1개) */
function segs(r: RoleSchedule) {
  return r.segments.map(g => `${fmt(g.start)}~${fmt(g.end)}`)
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

  it('앵커가 점유한 날은 앞 태스크가 건너뛰고 이어서 일한다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'T1', days: { 기획: 8 } },
      { id: 2, name: 'T2', days: { 기획: 2 }, fixedStart: '2026-07-22' },
      { id: 3, name: 'T3', days: { 기획: 1 } },
    ]
    const [t1, t2, t3] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    // 앵커는 지정한 날 그대로
    expect(segs(t2.roles['기획'])).toEqual(['2026-07-22~2026-07-23'])
    // T1은 앵커 기간에 멈췄다가 이어서 8일을 채운다
    expect(segs(t1.roles['기획'])).toEqual(['2026-07-20~2026-07-21', '2026-07-24~2026-07-31'])
    expect(t1.roles['기획'].days).toBe(8)
    // 토막별 영업일 수도 계산 단계에서 담아 둔다 (화면에서 다시 세지 않도록)
    expect(t1.roles['기획'].segments.map(g => g.days)).toEqual([2, 6])
    expect(fmt(t1.roles['기획'].start)).toBe('2026-07-20')
    expect(fmt(t1.roles['기획'].end)).toBe('2026-07-31')
    // T3는 앞의 점유가 모두 끝난 다음 빈 날
    expect(segs(t3.roles['기획'])).toEqual(['2026-08-03~2026-08-03'])
  })

  it('앵커끼리 겹치면 지정일이 점유된 뒤 순서 앵커가 첫 빈 날로 밀린다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 5 }, fixedStart: '2026-07-20' },
      { id: 2, name: 'B', days: { 기획: 3 }, fixedStart: '2026-07-22' },
    ]
    const [a, b] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(segs(a.roles['기획'])).toEqual(['2026-07-20~2026-07-24'])
    expect(segs(b.roles['기획'])).toEqual(['2026-07-27~2026-07-29'])
  })

  it('앵커도 진행 중 다른 앵커에 부딪히면 시작일은 지키고 쪼개진다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 2 }, fixedStart: '2026-07-23' },
      { id: 2, name: 'B', days: { 기획: 4 }, fixedStart: '2026-07-20' },
    ]
    const [a, b] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(segs(a.roles['기획'])).toEqual(['2026-07-23~2026-07-24'])
    expect(segs(b.roles['기획'])).toEqual(['2026-07-20~2026-07-22', '2026-07-27~2026-07-27'])
  })

  it('하위 직군은 상위 직군의 마지막 토막이 끝난 뒤 시작한다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'T1', days: { 기획: 4, PD: 2 } },
      { id: 2, name: 'T2', days: { 기획: 2 }, fixedStart: '2026-07-22' },
    ]
    const [t1] = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    expect(segs(t1.roles['기획'])).toEqual(['2026-07-20~2026-07-21', '2026-07-24~2026-07-27'])
    // 기획 마지막 토막이 7/27에 끝나므로 PD는 7/28부터
    expect(segs(t1.roles['PD'])).toEqual(['2026-07-28~2026-07-29'])
  })

  it('고정일이 없으면 막대는 쪼개지지 않는다', () => {
    const tasks: Task[] = [
      { id: 1, name: 'A', days: { 기획: 3, PD: 2 } },
      { id: 2, name: 'B', days: { 기획: 4, PD: 3 } },
    ]
    const schedules = calcSchedules(tasks, DEFAULT_ROLES, start, isWD)
    schedules.forEach(s =>
      Object.values(s.roles).forEach(r => expect(r.segments).toHaveLength(1)),
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
