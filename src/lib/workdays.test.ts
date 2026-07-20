import { describe, expect, it } from 'vitest'
import { DEFAULT_HOLIDAYS } from '../constants/holidays'
import { TEST_HOLIDAYS } from './testHolidays'
import { addWD, buildHolidaySet, countWD, fmt, makeIsWorkday, parseDate } from './workdays'

const isWD = makeIsWorkday(buildHolidaySet({ custom: [], disabled: [] }, TEST_HOLIDAYS))

describe('addWD', () => {
  it('주말을 건너뛴다', () => {
    // 2026-07-17(금) + 1영업일 = 07-20(월)
    expect(fmt(addWD(parseDate('2026-07-17'), 1, isWD))).toBe('2026-07-20')
  })

  it('공휴일을 건너뛴다', () => {
    // 2026-08-14(금) + 1영업일: 8/15(토·광복절), 8/16(일), 8/17(월·대체) 건너뛰고 8/18(화)
    expect(fmt(addWD(parseDate('2026-08-14'), 1, isWD))).toBe('2026-08-18')
  })

  it('0일이면 같은 날짜를 반환한다', () => {
    expect(fmt(addWD(parseDate('2026-07-17'), 0, isWD))).toBe('2026-07-17')
  })

  it('커스텀 휴무일을 반영한다', () => {
    const custom = makeIsWorkday(buildHolidaySet({ custom: ['2026-07-20'], disabled: [] }, TEST_HOLIDAYS))
    expect(fmt(addWD(parseDate('2026-07-17'), 1, custom))).toBe('2026-07-21')
  })

  it('기본 공휴일 해제를 반영한다', () => {
    const noLiberation = makeIsWorkday(buildHolidaySet({ custom: [], disabled: ['2026-08-17'] }, TEST_HOLIDAYS))
    expect(fmt(addWD(parseDate('2026-08-14'), 1, noLiberation))).toBe('2026-08-17')
  })
})

describe('DEFAULT_HOLIDAYS (자동 생성 데이터)', () => {
  it('YYYY-MM-DD 형식의 유효한 날짜만 담고 있다', () => {
    expect(DEFAULT_HOLIDAYS.length).toBeGreaterThan(0)
    DEFAULT_HOLIDAYS.forEach(d => {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(fmt(parseDate(d))).toBe(d)
    })
  })

  it('중복 없이 오름차순으로 정렬돼 있다', () => {
    expect(new Set(DEFAULT_HOLIDAYS).size).toBe(DEFAULT_HOLIDAYS.length)
    expect([...DEFAULT_HOLIDAYS].sort()).toEqual(DEFAULT_HOLIDAYS)
  })

  it('올해와 내년 공휴일을 포함한다', () => {
    const year = new Date().getFullYear()
    ;[year, year + 1].forEach(y => {
      expect(DEFAULT_HOLIDAYS.some(d => d.startsWith(String(y)))).toBe(true)
    })
  })
})

describe('countWD', () => {
  it('from 다음 날부터 to까지 영업일을 센다', () => {
    // 7/17(금) 다음날부터 7/22(수)까지: 20(월),21(화),22(수) = 3
    expect(countWD(parseDate('2026-07-17'), parseDate('2026-07-22'), isWD)).toBe(3)
  })

  it('to가 from 이전이면 0', () => {
    expect(countWD(parseDate('2026-07-22'), parseDate('2026-07-17'), isWD)).toBe(0)
  })
})
