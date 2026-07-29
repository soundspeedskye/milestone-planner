import { supabase } from './supabase'
import type { PlannerData } from '../types'

export type { PlannerData }

/** 랜딩 카드에 쓰는 목록 항목 (내용 data 는 포함하지 않음) */
export interface ProjectSummary {
  id: string
  name: string
  owner_name: string
  is_mine: boolean
  /** owner 또는 슈퍼관리자라서 비밀번호 없이 열 수 있는지 여부 */
  can_bypass_password: boolean
  has_password: boolean
  updated_at: string
}

/** open_project 결과 */
export interface OpenedProject {
  id: string
  name: string
  data: PlannerData
  is_mine: boolean
  updated_at: string
}

/** 모든 프로젝트 메타 목록 */
export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase.rpc('list_projects')
  if (error) throw error
  return (data ?? []) as ProjectSummary[]
}

/**
 * 프로젝트 열람. owner 는 비번 없이, 그 외에는 비번 일치 시 내용을 반환한다.
 * 비번이 틀리거나 프로젝트가 없으면 null.
 */
export async function openProject(id: string, password?: string): Promise<OpenedProject | null> {
  const { data, error } = await supabase.rpc('open_project', { p_id: id, p_pw: password ?? null })
  if (error) throw error
  const row = (data as OpenedProject[] | null)?.[0]
  return row ?? null
}

/** 새 프로젝트 생성. 비번은 서버에서 해시된다. 생성된 id 반환 */
export async function createProject(name: string, password: string, data: PlannerData): Promise<string> {
  const { data: id, error } = await supabase.rpc('create_project', {
    p_name: name,
    p_pw: password,
    p_data: data,
  })
  if (error) throw error
  return id as string
}

/** 내용 저장 (owner 만, RLS 로 보장). updated_at 도 갱신 */
export async function saveProjectData(id: string, data: PlannerData): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** 이름 변경 (owner 만) */
export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ name, updated_at: new Date().toISOString() })
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
