-- 프로젝트 주소(slug) 추가
-- 대상: 기존 운영 Supabase 프로젝트
-- 순서: 20260825_super_admin_edit.sql 다음에 실행한다 (can_edit 이 들어간 RPC 위에 slug 를 얹는다).
-- 영향: 기존 프로젝트의 slug 는 null 이며 지금처럼 /p/<uuid> 로 열린다. 데이터는 바뀌지 않는다.

alter table public.projects add column if not exists slug text;

-- 값이 있으면 전역 유일. null 은 여러 개 있어도 되므로 부분 인덱스를 쓴다.
create unique index if not exists projects_slug_key
  on public.projects (slug) where slug is not null;

-- 소문자 영숫자·하이픈 2~40자.
-- uuid 모양(8-4-4-4-12)은 막는다 — 주소 파서가 uuid 를 프로젝트 id 로 해석하기 때문에
-- 그런 slug 를 허용하면 영영 열 수 없는 주소가 된다.
alter table public.projects drop constraint if exists projects_slug_format;
alter table public.projects add constraint projects_slug_format check (
  slug is null or (
    slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$'
    and slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

-- ── RPC 재생성 (반환 열·인자가 바뀌므로 drop 후 다시 만든다) ──

drop function if exists public.list_projects();
create function public.list_projects()
returns table (
  id           uuid,
  name         text,
  slug         text,
  owner_name   text,
  is_mine      boolean,
  can_bypass_password boolean,
  can_edit     boolean,
  has_password boolean,
  updated_at   timestamptz
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select p.id,
         p.name,
         p.slug,
         coalesce(pr.display_name, pr.email, '알 수 없음') as owner_name,
         p.owner_id = auth.uid()                              as is_mine,
         (p.owner_id = auth.uid() or public.is_super_admin())  as can_bypass_password,
         (p.owner_id = auth.uid() or public.is_super_admin())  as can_edit,
         p.password_hash is not null                          as has_password,
         p.updated_at
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  order by p.created_at desc;
$$;

revoke all on function public.list_projects() from public;
grant execute on function public.list_projects() to authenticated;

drop function if exists public.open_project(uuid, text);
create function public.open_project(p_id uuid, p_pw text default null)
returns table (
  id         uuid,
  name       text,
  slug       text,
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
         p.slug,
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

-- 주소는 선택 입력이다. 비우면 null 로 저장되고 /p/<uuid> 주소를 쓴다.
-- 이미 쓰는 주소면 유니크 인덱스에 걸려 23505 로 실패하고, 앱이 안내 문구로 바꿔 보여준다.
drop function if exists public.create_project(text, text, jsonb);
drop function if exists public.create_project(text, text, jsonb, text);
create function public.create_project(p_name text, p_pw text, p_data jsonb, p_slug text default null)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  v_slug text := nullif(btrim(lower(coalesce(p_slug, ''))), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.projects (owner_id, name, slug, data, password_hash)
  values (
    auth.uid(),
    p_name,
    v_slug,
    coalesce(p_data, '{}'::jsonb),
    case when p_pw is null or p_pw = '' then null else crypt(p_pw, gen_salt('bf')) end
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.create_project(text, text, jsonb, text) from public;
grant execute on function public.create_project(text, text, jsonb, text) to authenticated;
