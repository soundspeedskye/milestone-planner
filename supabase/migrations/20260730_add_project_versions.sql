-- ─────────────────────────────────────────────────────────────
-- 마일스톤 플래너 · 버전 관리 (project_versions)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (idempotent)
--
-- 모델
--   · 버전은 그 시점의 PlannerData(projects.data)를 통째로 복사해 둔 스냅샷이다.
--   · 목록/열람 : 프로젝트를 열 수 있는 사람이면 누구나 (owner·슈퍼관리자·비번 보유자)
--   · 저장/삭제 : owner 만
-- ─────────────────────────────────────────────────────────────

create table if not exists public.project_versions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  label      text not null,
  note       text,
  data       jsonb not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_versions_project_idx
  on public.project_versions(project_id, created_at desc);

alter table public.project_versions enable row level security;

-- 테이블 직접 접근은 소유 프로젝트의 버전만 (그 외 경로는 아래 SECURITY DEFINER RPC).
drop policy if exists project_versions_owner_all on public.project_versions;
create policy project_versions_owner_all on public.project_versions
  for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_versions.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_versions.project_id and p.owner_id = auth.uid()
  ));

-- ── 접근 판정 헬퍼: open_project 과 동일한 술어 (owner·슈퍼관리자·비번일치) ──
create or replace function public.can_read_project(p_id uuid, p_pw text)
returns boolean
language sql
security definer
set search_path = public, extensions
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_id
      and (
        p.owner_id = auth.uid()
        or exists (select 1 from public.super_admins sa where sa.user_id = auth.uid())
        or (p.password_hash is not null and p.password_hash = crypt(p_pw, p.password_hash))
      )
  );
$$;

revoke all on function public.can_read_project(uuid, text) from public;
grant execute on function public.can_read_project(uuid, text) to authenticated;

-- ── RPC: 버전 목록 (data 제외) ───────────────────────────────
create or replace function public.list_versions(p_project_id uuid, p_pw text default null)
returns table (
  id         uuid,
  label      text,
  note       text,
  owner_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select v.id,
         v.label,
         v.note,
         coalesce(pr.display_name, pr.email, '알 수 없음') as owner_name,
         v.created_at
  from public.project_versions v
  left join public.profiles pr on pr.id = v.created_by
  where v.project_id = p_project_id
    and public.can_read_project(p_project_id, p_pw)
  order by v.created_at desc;
$$;

revoke all on function public.list_versions(uuid, text) from public;
grant execute on function public.list_versions(uuid, text) to authenticated;

-- ── RPC: 특정 버전 내용 ──────────────────────────────────────
create or replace function public.get_version(p_version_id uuid, p_pw text default null)
returns jsonb
language sql
security definer
set search_path = public, extensions
stable
as $$
  select v.data
  from public.project_versions v
  where v.id = p_version_id
    and public.can_read_project(v.project_id, p_pw);
$$;

revoke all on function public.get_version(uuid, text) from public;
grant execute on function public.get_version(uuid, text) to authenticated;

-- ── RPC: 버전 저장 (owner 만, label 비우면 v{개수+1} 자동) ────
create or replace function public.create_version(
  p_project_id uuid,
  p_label      text,
  p_note       text,
  p_data       jsonb
)
returns table (
  id         uuid,
  label      text,
  note       text,
  owner_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id     uuid;
  the_label  text;
begin
  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = auth.uid()
  ) then
    raise exception 'project not found or not owner';
  end if;

  the_label := nullif(btrim(coalesce(p_label, '')), '');
  if the_label is null then
    the_label := 'v' || (
      select count(*) + 1
      from public.project_versions v
      where v.project_id = p_project_id
    );
  end if;

  insert into public.project_versions (project_id, label, note, data, created_by)
  values (p_project_id, the_label, nullif(btrim(coalesce(p_note, '')), ''), p_data, auth.uid())
  returning project_versions.id into new_id;

  return query
    select v.id,
           v.label,
           v.note,
           coalesce(pr.display_name, pr.email, '알 수 없음') as owner_name,
           v.created_at
    from public.project_versions v
    left join public.profiles pr on pr.id = v.created_by
    where v.id = new_id;
end;
$$;

revoke all on function public.create_version(uuid, text, text, jsonb) from public;
grant execute on function public.create_version(uuid, text, text, jsonb) to authenticated;

-- ── RPC: 버전 삭제 (owner 만) ────────────────────────────────
create or replace function public.delete_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.project_versions v
  using public.projects p
  where v.id = p_version_id
    and p.id = v.project_id
    and p.owner_id = auth.uid();
  if not found then
    raise exception 'version not found or not owner';
  end if;
end;
$$;

revoke all on function public.delete_version(uuid) from public;
grant execute on function public.delete_version(uuid) to authenticated;
