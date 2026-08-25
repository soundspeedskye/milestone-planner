/**
 * 앱 주소 ↔ 화면 매핑.
 *
 * - `/`              프로젝트 목록(랜딩)
 * - `/p/<uuid>`      프로젝트 상세 (주소를 지정하지 않은 프로젝트)
 * - `/p/<주소>`      프로젝트 상세 (생성·수정 시 지정한 주소)
 *
 * 라우터 라이브러리를 쓰지 않는다. 화면이 둘뿐이고, 진실의 원천은 워크스페이스
 * 스토어다. 주소를 "읽는" 곳은 앱 부팅 시와 popstate 두 군데뿐이고, 나머지는
 * 스토어 액션이 주소를 "쓴다".
 */

/** 주소 한 조각이 uuid 면 id 로, 아니면 지정 주소(slug)로 해석한다 */
export type ProjectRef = { by: 'id'; value: string } | { by: 'slug'; value: string }
export type Route = { name: 'landing' } | { name: 'project'; ref: ProjectRef }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** 소문자 영숫자·하이픈 2~40자 (DB 의 projects_slug_format 제약과 같은 규칙) */
const SLUG = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/
const PROJECT_PATH = /^\/p\/([^/]+)\/?$/

/** 주소로 쓸 수 있는 값인지. uuid 모양은 프로젝트 id 로 해석되므로 주소로 쓸 수 없다 */
export const isValidSlug = (value: string) => SLUG.test(value) && !UUID.test(value)

/** 사용자가 입력한 주소를 저장 형태로 다듬는다 (공백 제거·소문자) */
export const normalizeSlug = (value: string) => value.trim().toLowerCase()

export function parseRoute(pathname?: string): Route {
  const path = pathname ?? (typeof window === 'undefined' ? '/' : window.location.pathname)
  const m = PROJECT_PATH.exec(path)
  if (!m) return { name: 'landing' }
  const key = decodeURIComponent(m[1])
  if (UUID.test(key)) return { name: 'project', ref: { by: 'id', value: key.toLowerCase() } }
  if (isValidSlug(key)) return { name: 'project', ref: { by: 'slug', value: key } }
  return { name: 'landing' }
}

/** 주소가 있으면 그 주소로, 없으면 uuid 로 경로를 만든다 */
export const projectPath = (project: { id: string; slug?: string | null }) =>
  `/p/${project.slug || project.id}`

export const LANDING_PATH = '/'
