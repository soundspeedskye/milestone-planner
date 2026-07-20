import { DEFAULT_HOLIDAYS } from '../constants/holidays'
import type { HolidayConfig } from '../types'

export const pad = (n: number) => String(n).padStart(2, '0')
export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDate = (s: string) => new Date(s + 'T00:00:00')

export type IsWorkday = (d: Date) => boolean

export const isWeekend = (d: Date) => {
  const w = d.getDay()
  return w === 0 || w === 6
}

/** 휴무일 설정을 반영한 "쉬는 날(주말 제외)" 판별용 Set */
export function buildHolidaySet(config: HolidayConfig): Set<string> {
  const set = new Set(DEFAULT_HOLIDAYS)
  config.disabled.forEach(d => set.delete(d))
  config.custom.forEach(d => set.add(d))
  return set
}

export function makeIsWorkday(holidays: Set<string>): IsWorkday {
  return d => !isWeekend(d) && !holidays.has(fmt(d))
}

/** from 다음 날부터 세어 days번째 영업일을 반환 (기존 addWD와 동일) */
export function addWD(from: Date, days: number, isWD: IsWorkday): Date {
  if (!days || days <= 0) return new Date(from)
  const d = new Date(from)
  let c = 0
  while (c < days) {
    d.setDate(d.getDate() + 1)
    if (isWD(d)) c++
  }
  return d
}

/** from 다음 날부터 to까지의 영업일 수 (기존 countWD와 동일) */
export function countWD(from: Date, to: Date, isWD: IsWorkday): number {
  const d = new Date(from)
  let c = 0
  d.setDate(d.getDate() + 1)
  while (d <= to) {
    if (isWD(d)) c++
    d.setDate(d.getDate() + 1)
  }
  return c
}
