import { describe, expect, it } from 'vitest'
import { ROLE_PALETTES } from '../constants/roles'
import type { RoleDef, Task } from '../types'
import { calcSchedules } from './schedule'
import { TEST_HOLIDAYS } from './testHolidays'
import { buildHolidaySet, fmt, makeIsWorkday, parseDate } from './workdays'

/**
 * 실제 프로젝트(브링앤티) 스냅샷 재현 테스트.
 *
 * v3.3(고정일이 앞 일정과 겹칠 수 있던 버전)으로 뽑은 결과를 그대로 담아 두고,
 * 지금 엔진이 같은 일정을 내는지 확인한다. 고정일 태스크가 목록 맨 앞에 있는 배치라
 * "앵커 뒤 태스크는 앵커 뒤에서 시작한다" 규칙이 깨지면 바로 어긋난다.
 */

// 앱 기본 공휴일과 같게 맞춘다.
// TEST_HOLIDAYS에 없는 이 기간의 공휴일(7/17, 10/5 개천절 대체)을 채워 넣는다.
const isWD = makeIsWorkday(
  buildHolidaySet({ custom: ['2026-07-17', '2026-10-05'], disabled: [] }, TEST_HOLIDAYS),
)

const ROLES: RoleDef[] = [
  { id: '기획', name: '기획', palette: ROLE_PALETTES[0], dependsOn: [] },
  { id: 'PD', name: 'PD', palette: ROLE_PALETTES[1], dependsOn: ['기획'] },
  { id: 'BE', name: 'BE', palette: ROLE_PALETTES[2], dependsOn: ['기획'] },
  { id: 'FE', name: 'FE', palette: ROLE_PALETTES[3], dependsOn: ['PD'] },
]

/** 직군 → [소요일, 시작일, 종료일] (간트 목록 순서 그대로) */
const SNAPSHOT: {
  id: number
  name: string
  fixedStart?: string
  roles: Record<string, [number, string, string]>
}[] = [
  { id: 15, name: '회원번호 추가 개발', fixedStart: '2026-07-24', roles: {
    BE: [5, '2026-07-24', '2026-07-30'] } },
  { id: 18, name: '[BOS] 주문/배송/결제', roles: {
    기획: [20, '2026-06-24', '2026-07-22'], PD: [10, '2026-07-23', '2026-08-05'],
    BE: [10, '2026-07-31', '2026-08-13'], FE: [8, '2026-08-06', '2026-08-18'] } },
  { id: 17, name: '[앱] 주문/배송/결제', roles: {
    BE: [10, '2026-08-14', '2026-08-28'] } },
  { id: 8, name: '쿠폰 관리', roles: {
    기획: [9, '2026-07-23', '2026-08-04'], PD: [7, '2026-08-06', '2026-08-14'],
    BE: [5, '2026-08-31', '2026-09-04'], FE: [5, '2026-08-19', '2026-08-25'] } },
  { id: 10, name: '대시보드', roles: {
    기획: [4, '2026-08-05', '2026-08-10'], PD: [4, '2026-08-18', '2026-08-21'],
    BE: [4, '2026-09-07', '2026-09-10'], FE: [4, '2026-08-26', '2026-08-31'] } },
  { id: 16, name: '[BOS] 회원번호 추가에 따른 수정건', roles: {
    기획: [4, '2026-08-11', '2026-08-14'], PD: [2, '2026-08-24', '2026-08-25'],
    BE: [3, '2026-09-11', '2026-09-15'], FE: [3, '2026-09-01', '2026-09-03'] } },
  { id: 9, name: '회원상세페이지 [주문내역]', roles: {
    기획: [2, '2026-08-18', '2026-08-19'], PD: [3, '2026-08-26', '2026-08-28'],
    BE: [2, '2026-09-16', '2026-09-17'], FE: [2, '2026-09-04', '2026-09-07'] } },
  { id: 19, name: '권한 관리', roles: {
    기획: [2, '2026-08-20', '2026-08-21'], PD: [2, '2026-08-31', '2026-09-01'],
    BE: [3, '2026-09-18', '2026-09-22'], FE: [3, '2026-09-08', '2026-09-10'] } },
  { id: 14, name: '카카오 채널 연계 [카카오채널]', roles: {
    기획: [5, '2026-08-24', '2026-08-28'], PD: [5, '2026-09-02', '2026-09-08'],
    BE: [3, '2026-09-23', '2026-09-29'], FE: [3, '2026-09-11', '2026-09-15'] } },
  { id: 11, name: '다국어처리', roles: {
    BE: [3, '2026-09-30', '2026-10-02'], FE: [3, '2026-09-16', '2026-09-18'] } },
  { id: 12, name: '회원 정보 마이그레이션', roles: {
    BE: [5, '2026-10-06', '2026-10-13'] } },
  { id: 13, name: '마스터 차량 관리 마이그레이션', roles: {
    BE: [5, '2026-10-14', '2026-10-20'] } },
]

const TASKS: Task[] = SNAPSHOT.map(t => ({
  id: t.id,
  name: t.name,
  days: Object.fromEntries(Object.entries(t.roles).map(([r, [d]]) => [r, d])),
  ...(t.fixedStart ? { fixedStart: t.fixedStart } : {}),
}))

describe('실제 프로젝트 스냅샷 재현', () => {
  const schedules = calcSchedules(TASKS, ROLES, parseDate('2026-06-24'), isWD)

  it('모든 태스크의 직군별 시작·종료일이 스냅샷과 같다', () => {
    const actual = schedules.map(s =>
      Object.fromEntries(
        Object.entries(s.roles).map(([r, v]) => [r, [fmt(v.start), fmt(v.end)]]),
      ),
    )
    const expected = SNAPSHOT.map(t =>
      Object.fromEntries(Object.entries(t.roles).map(([r, [, st, en]]) => [r, [st, en]])),
    )
    expect(actual).toEqual(expected)
  })

  it('막대가 쪼개지지 않는다 (앵커가 목록 맨 앞이라 끊길 일이 없다)', () => {
    schedules.forEach(s =>
      Object.values(s.roles).forEach(r => expect(r.segments).toHaveLength(1)),
    )
  })
})
