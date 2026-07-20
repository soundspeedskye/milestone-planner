#!/usr/bin/env node
/**
 * data.go.kr 특일정보 API에서 공휴일을 받아
 * src/constants/holidays.generated.ts 를 재생성한다.
 *
 * 사용법:
 *   DATA_GO_KR_SERVICE_KEY=<일반 인증키(Decoding)> npm run fetch:holidays
 *
 * - 올해 기준 [작년 .. +2년]을 조회한다.
 * - API가 빈 결과를 주는 연도(아직 미발표 등)는 기존 목록을 그대로 유지한다.
 * - 조회 범위 밖 연도의 기존 항목도 유지한다.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE = process.env.DATA_GO_KR_API_BASE
  ?? 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('오류: DATA_GO_KR_SERVICE_KEY 환경변수가 필요합니다.')
  console.error('  1) https://www.data.go.kr 에서 "특일 정보" API 활용 신청 (무료)')
  console.error('  2) 마이페이지의 "일반 인증키(Decoding)"를 환경변수로 설정')
  process.exit(1)
}

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '../src/constants/holidays.generated.ts')

async function fetchYear(year) {
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    solYear: String(year),
    numOfRows: '100',
    _type: 'json',
  })
  const res = await fetch(`${API_BASE}/getRestDeInfo?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} (${year}년)`)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    // 키 오류 등은 XML로 응답한다
    throw new Error(`JSON이 아닌 응답 (${year}년): ${text.slice(0, 200)}`)
  }
  const header = data?.response?.header
  if (header?.resultCode !== '00') {
    throw new Error(`API 오류 (${year}년): ${header?.resultCode} ${header?.resultMsg}`)
  }
  const items = data?.response?.body?.items?.item ?? []
  const list = Array.isArray(items) ? items : [items]
  return list
    .filter(it => it.isHoliday === 'Y' && it.locdate)
    .map(it => String(it.locdate).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'))
}

function readExisting() {
  const src = readFileSync(OUT_FILE, 'utf8')
  return [...src.matchAll(/'(\d{4}-\d{2}-\d{2})'/g)].map(m => m[1])
}

const thisYear = new Date().getFullYear()
const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2]
const existing = readExisting()

const merged = new Map()
existing.forEach(d => {
  const set = merged.get(d.slice(0, 4)) ?? new Set()
  set.add(d)
  merged.set(d.slice(0, 4), set)
})

for (const year of years) {
  const dates = await fetchYear(year)
  if (dates.length === 0) {
    console.warn(`${year}년: API 결과 없음 → 기존 ${merged.get(String(year))?.size ?? 0}건 유지`)
    continue
  }
  merged.set(String(year), new Set(dates))
  console.log(`${year}년: ${dates.length}건`)
}

const all = [...merged.values()].flatMap(set => [...set]).sort()
const body = all.map(d => `  '${d}',`).join('\n')
writeFileSync(OUT_FILE, `// 자동 생성 파일 — 직접 수정하지 마세요.
// \`npm run fetch:holidays\` (data.go.kr 특일정보 API)로 갱신됩니다.
export const DEFAULT_HOLIDAYS: string[] = [
${body}
]
`)
console.log(`총 ${all.length}건 → ${OUT_FILE}`)
