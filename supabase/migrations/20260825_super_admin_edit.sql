-- 슈퍼관리자 편집 권한 추가 (기존 읽기 전용 열람 → 열람 + 편집)
-- 대상: 기존 운영 Supabase 프로젝트
-- 영향: projects 의 기존 데이터·owner_id·password_hash 는 변경하지 않는다.
--       비밀번호 변경·프로젝트 삭제는 그대로 owner 전용이다.

-- ── 권한 판정 헬퍼 ───────────────────────────────────────────
-- super_admins 는 authenticated 에게 revoke 되어 있어 RLS 정책 식에서 직접
-- 참조하면 permission denied 가 난다. SECURITY DEFINER 함수로 감싸서 쓴다.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public, extensions
stable
as $$
  select exists (
    select 1 from public.super_admins sa where sa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- owner 이거나 슈퍼관리자면 편집 가능
create or replace function public.can_edit_project(p_id uuid)
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
      and (p.owner_id = auth.uid() or public.is_super_admin())
  );
$$;

revoke all on function public.can_edit_project(uuid) from public;
grant execute on function public.can_edit_project(uuid) to authenticated;

-- ── projects: 슈퍼관리자 조회·수정 정책 ──────────────────────
-- owner 정책(projects_owner_all)은 그대로 두고 정책을 하나 더 얹는다.
-- (여러 정책은 OR 로 합쳐진다) 삭제·비번 변경은 owner 전용으로 남긴다.
drop policy if exists projects_super_admin_read on public.projects;
create policy projects_super_admin_read on public.projects
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists projects_super_admin_update on public.projects;
create policy projects_super_admin_update on public.projects
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── RPC: 목록에 can_edit 추가 ────────────────────────────────
drop function if exists public.list_projects();
create function public.list_projects()
returns table (
  id                  uuid,
  name                text,
  owner_name          text,
  is_mine             boolean,
  can_bypass_password boolean,
  can_edit            boolean,
  has_password        boolean,
  updated_at          timestamptz
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select p.id,
         p.name,
         coalesce(pr.display_name, pr.email, '알 수 없음') as owner_name,
         p.owner_id = auth.uid()                          as is_mine,
         (p.owner_id = auth.uid() or public.is_super_admin()) as can_bypass_password,
         (p.owner_id = auth.uid() or public.is_super_admin()) as can_edit,
         p.password_hash is not null                      as has_password,
         p.updated_at
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  order by p.created_at desc;
$$;

revoke all on function public.list_projects() from public;
grant execute on function public.list_projects() to authenticated;

-- ── RPC: 열람 결과에 can_edit 추가 ───────────────────────────
drop function if exists public.open_project(uuid, text);
create function public.open_project(p_id uuid, p_pw text default null)
returns table (
  id         uuid,
  name       text,
  data       jsonb,
  is_mine    boolean,
  can_edit   boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select p.id,
         p.name,
         p.data,
         p.owner_id = auth.uid()                              as is_mine,
         (p.owner_id = auth.uid() or public.is_super_admin())  as can_edit,
         p.updated_at
  from public.projects p
  where p.id = p_id
    and (
      p.owner_id = auth.uid()
      or public.is_super_admin()
      or (p.password_hash is not null and p.password_hash = crypt(p_pw, p.password_hash))
    );
$$;

revoke all on function public.open_project(uuid, text) from public;
grant execute on function public.open_project(uuid, text) to authenticated;

-- 기존 열람 판정 헬퍼도 새 헬퍼를 쓰도록 정리 (동작은 동일)
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
        or public.is_super_admin()
        or (p.password_hash is not null and p.password_hash = crypt(p_pw, p.password_hash))
      )
  );
$$;

revoke all on function public.can_read_project(uuid, text) from public;
grant execute on function public.can_read_project(uuid, text) to authenticated;

-- ── 버전: 저장·삭제도 편집 권한 기준으로 ─────────────────────
drop policy if exists project_versions_owner_all on public.project_versions;
create policy project_versions_owner_all on public.project_versions
  for all to authenticated
  using (public.can_edit_project(project_versions.project_id))
  with check (public.can_edit_project(project_versions.project_id));

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
  if not public.can_edit_project(p_project_id) then
    raise exception 'project not found or not editable';
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
    and public.can_edit_project(p.id);
  if not found then
    raise exception 'version not found or not editable';
  end if;
end;
$$;

revoke all on function public.delete_version(uuid) from public;
grant execute on function public.delete_version(uuid) to authenticated;
