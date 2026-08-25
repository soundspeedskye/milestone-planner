import { supabase } from './supabase'
import type { PlannerData } from '../types'

export type { PlannerData }

/** 랜딩 카드에 쓰는 목록 항목 (내용 data 는 포함하지 않음) */
export interface ProjectSummary {
  id: string
  name: string
  /** 지정한 주소. null 이면 /p/<uuid> 로 연다 */
  slug: string | null
  owner_name: string
  is_mine: boolean
  /** owner 또는 슈퍼관리자라서 비밀번호 없이 열 수 있는지 여부 */
  can_bypass_password: boolean
  /** owner 또는 슈퍼관리자라서 편집할 수 있는지 여부 */
  can_edit: boolean
  has_password: boolean
  updated_at: string
}

/** open_project 결과 */
export interface OpenedProject {
  id: string
  name: string
  /** 지정한 주소. null 이면 /p/<uuid> 로 연다 */
  slug: string | null
  data: PlannerData
  is_mine: boolean
  /** owner 또는 슈퍼관리자라서 편집할 수 있는지 여부 */
  can_edit: boolean
  updated_at: string
}

/**
 * can_edit·slug 는 나중에 생긴 열이라, 해당 SQL 을 아직 적용하지 않은 환경에서도
 * 앱이 그대로 동작하도록 기본값을 채운다.
 * (can_edit 이 없으면 owner 만 편집, slug 가 없으면 주소 없이 uuid 로 연다)
 */
function normalizeRow<T extends { is_mine: boolean; can_edit?: boolean; slug?: string | null }>(row: T): T {
  return { ...row, can_edit: row.can_edit ?? row.is_mine, slug: row.slug ?? null }
}

/** 모든 프로젝트 메타 목록 */
export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase.rpc('list_projects')
  if (error) throw error
  return ((data ?? []) as ProjectSummary[]).map(normalizeRow)
}

/**
 * 프로젝트 열람. owner·슈퍼관리자는 비번 없이, 그 외에는 비번 일치 시 내용을 반환한다.
 * 비번이 틀리거나 프로젝트가 없으면 null.
 */
export async function openProject(id: string, password?: string): Promise<OpenedProject | null> {
  const { data, error } = await supabase.rpc('open_project', { p_id: id, p_pw: password ?? null })
  if (error) throw error
  const row = (data as OpenedProject[] | null)?.[0]
  return row ? normalizeRow(row) : null
}

/**
 * 새 프로젝트 생성. 비번은 서버에서 해시된다. 생성된 id 반환.
 * slug 를 비우면 주소를 지정하지 않은 것으로 보고 /p/<uuid> 주소를 쓴다.
 */
export async function createProject(
  name: string,
  password: string,
  data: PlannerData,
  slug?: string | null,
): Promise<string> {
  const args = { p_name: name, p_pw: password, p_data: data }
  const { data: id, error } = await supabase.rpc('create_project', { ...args, p_slug: slug || null })
  if (!error) return id as string
  // 주소 마이그레이션을 아직 적용하지 않은 환경이면 p_slug 를 받는 함수가 없다.
  // 주소를 지정하지 않은 생성은 예전 함수로 그대로 처리한다.
  if (error.code === 'PGRST202' && !slug) {
    const retry = await supabase.rpc('create_project', args)
    if (retry.error) throw retry.error
    return retry.data as string
  }
  throw error
}

/** 주소가 이미 쓰이고 있어서 실패했는지 (Postgres 유니크 위반) */
export const isSlugTaken = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505'

/** 내용 저장 (owner·슈퍼관리자만, RLS 로 보장). updated_at 도 갱신 */
export async function saveProjectData(id: string, data: PlannerData): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * 이름·주소 변경 (owner·슈퍼관리자만, RLS 로 보장). updated_at 도 갱신.
 * 주소의 형식과 중복은 DB 제약(projects_slug_format·projects_slug_key)이 최종 판정한다.
 */
export async function updateProjectMeta(
  id: string,
  patch: { name?: string; slug?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** 비번 변경/해제 (owner 만, 서버에서 해시). 빈 문자열이면 공유 해제 */
export async function setProjectPassword(id: string, password: string): Promise<void> {
  const { error } = await supabase.rpc('set_project_password', { p_id: id, p_pw: password })
  if (error) throw error
}

/** 프로젝트 삭제 (owner 만) */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
