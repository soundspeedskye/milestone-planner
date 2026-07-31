import { supabase } from './supabase'
import type { PlannerData } from '../types'

/** 버전 목록 항목 (내용 data 는 포함하지 않음) */
export interface VersionSummary {
  id: string
  label: string
  note: string | null
  owner_name: string
  created_at: string
}

/** 프로젝트의 버전 목록. p_pw 는 비번으로 연 열람자용(owner 는 무시된다) */
export async function listVersions(projectId: string, password?: string): Promise<VersionSummary[]> {
  const { data, error } = await supabase.rpc('list_versions', {
    p_project_id: projectId,
    p_pw: password ?? null,
  })
  if (error) throw error
  return (data ?? []) as VersionSummary[]
}

/** 특정 버전의 PlannerData 내용 */
export async function getVersion(versionId: string, password?: string): Promise<PlannerData | null> {
  const { data, error } = await supabase.rpc('get_version', {
    p_version_id: versionId,
    p_pw: password ?? null,
  })
  if (error) throw error
  return (data as PlannerData | null) ?? null
}

/** 현재 상태를 버전으로 저장 (owner 만). label 을 비우면 서버가 v{n} 을 붙인다 */
export async function createVersion(
  projectId: string,
  label: string,
  note: string,
  data: PlannerData,
): Promise<VersionSummary> {
  const { data: rows, error } = await supabase.rpc('create_version', {
    p_project_id: projectId,
    p_label: label,
    p_note: note,
    p_data: data,
  })
  if (error) throw error
  return (rows as VersionSummary[])[0]
}

/** 버전 삭제 (owner 만) */
export async function deleteVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_version', { p_version_id: versionId })
  if (error) throw error
}
