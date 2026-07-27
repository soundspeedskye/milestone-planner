import { LATEST_UPDATE } from '../constants/changelog'

// 마지막으로 본 업데이트 버전을 담는 키
const KEY = 'milestone_planner_last_seen_update'

/** 마지막으로 본 업데이트 버전. 기록이 없으면 null (= 신규 사용자) */
export function getLastSeenUpdate(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** 최신 업데이트를 본 것으로 기록한다 */
export function markUpdatesSeen(): void {
  try {
    localStorage.setItem(KEY, LATEST_UPDATE)
  } catch {
    // localStorage 를 못 쓰는 환경이면 조용히 넘긴다
  }
}
