import { describe, expect, it } from 'vitest'
import { isValidSlug, LANDING_PATH, normalizeSlug, parseRoute, projectPath } from './route'

const ID = '50c63b6a-88d6-4fcf-b2ab-fc8dbc387d5a'

describe('parseRoute', () => {
  it('루트는 목록 화면', () => {
    expect(parseRoute('/')).toEqual({ name: 'landing' })
  })

  it('/p/<uuid> 는 id 로 여는 프로젝트 상세', () => {
    expect(parseRoute(`/p/${ID}`)).toEqual({ name: 'project', ref: { by: 'id', value: ID } })
  })

  it('끝에 슬래시가 붙어도 같은 프로젝트', () => {
    expect(parseRoute(`/p/${ID}/`)).toEqual({ name: 'project', ref: { by: 'id', value: ID } })
  })

  it('대문자 uuid 는 소문자로 맞춘다 (id 비교가 어긋나지 않도록)', () => {
    expect(parseRoute(`/p/${ID.toUpperCase()}`)).toEqual({
      name: 'project', ref: { by: 'id', value: ID },
    })
  })

  it('uuid 가 아니면 지정 주소로 해석한다', () => {
    expect(parseRoute('/p/bring-n-t')).toEqual({
      name: 'project', ref: { by: 'slug', value: 'bring-n-t' },
    })
  })

  it('주소 형식이 아니거나 모르는 경로는 목록으로 떨어진다', () => {
    expect(parseRoute('/p/A-대문자-한글')).toEqual({ name: 'landing' })
    expect(parseRoute('/p/x')).toEqual({ name: 'landing' })          // 1자
    expect(parseRoute('/p/-lead-hyphen')).toEqual({ name: 'landing' })
    expect(parseRoute(`/p/${ID}/extra`)).toEqual({ name: 'landing' })
    expect(parseRoute('/settings')).toEqual({ name: 'landing' })
  })
})

describe('projectPath', () => {
  it('주소가 없으면 uuid 경로', () => {
    expect(projectPath({ id: ID, slug: null })).toBe(`/p/${ID}`)
    expect(projectPath({ id: ID })).toBe(`/p/${ID}`)
  })

  it('주소가 있으면 그 주소로', () => {
    expect(projectPath({ id: ID, slug: 'bring-n-t' })).toBe('/p/bring-n-t')
  })

  it('파싱과 왕복이 맞는다', () => {
    expect(parseRoute(projectPath({ id: ID, slug: null }))).toEqual({
      name: 'project', ref: { by: 'id', value: ID },
    })
    expect(parseRoute(projectPath({ id: ID, slug: 'bring-n-t' }))).toEqual({
      name: 'project', ref: { by: 'slug', value: 'bring-n-t' },
    })
    expect(parseRoute(LANDING_PATH)).toEqual({ name: 'landing' })
  })
})

describe('isValidSlug', () => {
  it('소문자·숫자·하이픈 2~40자를 받는다', () => {
    expect(isValidSlug('mevid')).toBe(true)
    expect(isValidSlug('bring-n-t')).toBe(true)
    expect(isValidSlug('b2b')).toBe(true)
    expect(isValidSlug('a'.repeat(40))).toBe(true)
  })

  it('형식에 맞지 않으면 거른다', () => {
    expect(isValidSlug('x')).toBe(false)                 // 너무 짧음
    expect(isValidSlug('a'.repeat(41))).toBe(false)      // 너무 김
    expect(isValidSlug('MEVID')).toBe(false)             // 대문자
    expect(isValidSlug('브링앤티')).toBe(false)           // 한글
    expect(isValidSlug('-lead')).toBe(false)             // 하이픈으로 시작
    expect(isValidSlug('trail-')).toBe(false)            // 하이픈으로 끝
    expect(isValidSlug('has space')).toBe(false)
    expect(isValidSlug('has/slash')).toBe(false)
  })

  it('uuid 모양은 주소로 쓸 수 없다 (id 로 해석되어 못 여는 주소가 된다)', () => {
    expect(isValidSlug(ID)).toBe(false)
  })
})

describe('normalizeSlug', () => {
  it('앞뒤 공백을 없애고 소문자로 맞춘다', () => {
    expect(normalizeSlug('  MeVid  ')).toBe('mevid')
    expect(normalizeSlug('')).toBe('')
  })
})
