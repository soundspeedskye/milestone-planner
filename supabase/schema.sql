-- ─────────────────────────────────────────────────────────────
-- 마일스톤 플래너 · Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 실행하세요.
-- (여러 번 실행해도 안전하도록 대부분 idempotent 하게 작성)
--
-- 접근 모델
--   · 앱 진입      : @safience.com 로그인 필수
--   · 목록 조회    : 로그인 회원이면 모든 프로젝트 메타(내용 제외)가 보임
--   · 내용 열람    : owner·슈퍼관리자는 바로, 그 외에는 프로젝트 비번 일치 시
--   · 편집         : owner·슈퍼관리자
--   · 삭제·비번변경 : owner 만
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── 프로필 (작성자 이름 표시용) ───────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── 가입 시: 도메인 검증 + 프로필 자동 생성 ───────────────────
-- AFTER INSERT 에서 raise 하면 auth.users insert 까지 롤백된다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if lower(new.email) not like '%@safience.com' then
    raise exception 'safience.com 도메인 이메일만 가입할 수 있습니다';
  end if;
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거가 없던 시절에 가입한 계정(예: 테스트 계정)의 프로필을 채운다
insert into public.profiles (id, email, display_name)
select id, email, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

-- ── 프로젝트 ─────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users on delete cascade,
  name          text not null,
  slug          text,                       -- 주소. null 이면 /p/<uuid> 로 연다
  data          jsonb not null default '{}'::jsonb,
  password_hash text,                       -- null 이면 owner 외엔 못 엶
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects(owner_id);

-- 주소는 값이 있을 때만 전역 유일 (주소를 안 쓰는 프로젝트가 여럿일 수 있으므로 부분 인덱스)
create unique index if not exists projects_slug_key
  on public.projects (slug) where slug is not null;

-- 소문자 영숫자·하이픈 2~40자.
-- uuid 모양은 막는다 — 주소 파서가 uuid 를 프로젝트 id 로 해석하기 때문에
-- 그런 slug 를 허용하면 영영 열 수 없는 주소가 된다.
alter table public.projects drop constraint if exists projects_slug_format;
alter table public.projects add constraint projects_slug_format check (
  slug is null or (
    slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$'
    and slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

alter table public.projects enable row level security;

-- ── 슈퍼관리자 ───────────────────────────────────────────────
-- 일반 로그인 사용자는 이 테이블을 조회하거나 수정할 수 없다.
-- 이 테이블을 참조하는 SECURITY DEFINER RPC만 권한을 판정한다.
create table if not exists public.super_admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;
revoke all on table public.super_admins from anon, authenticated;

-- 현재 슈퍼관리자. 계정이 아직 없으면 행을 만들지 않으며, 가입 후 이 스키마를 다시
-- 실행하면 자동 등록된다. 권한은 이메일이 아니라 auth.users UUID에 연결된다.
insert into public.super_admins (user_id)
select id
from auth.users
where lower(email) = 'super-tester@safience.com'
on conflict (user_id) do nothing;

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

-- 테이블 직접 접근은 owner 본인 행만 (select/insert/update/delete 전부).
-- 남의 프로젝트 목록·열람은 아래 SECURITY DEFINER 함수로만 나간다.
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 슈퍼관리자는 모든 프로젝트를 조회·수정할 수 있다 (정책은 OR 로 합쳐진다).
-- 삭제·비밀번호 변경은 owner 전용으로 남긴다.
drop policy if exists projects_super_admin_read on public.projects;
create policy projects_super_admin_read on public.projects
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists projects_super_admin_update on public.projects;
create policy projects_super_admin_update on public.projects
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── RPC: 모든 프로젝트 메타 목록 (내용 data 는 제외) ──────────
-- 반환 형식에 열을 추가했으므로, 기존 함수가 있는 환경에서는 먼저 재생성한다.
drop function if exists public.list_projects();
create or replace function public.list_projects()
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

-- ── RPC: 프로젝트 열람 (owner·슈퍼관리자는 비번 무시, 그 외는 비번 대조) ─
-- can_edit 열을 추가했으므로, 기존 함수가 있는 환경에서는 먼저 재생성한다.
drop function if exists public.open_project(uuid, text);
create or replace function public.open_project(p_id uuid, p_pw text default null)
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

-- ── RPC: 프로젝트 생성 (비번은 서버에서 해시) ────────────────
-- 주소(p_slug)는 선택 입력이다. 비우면 null 로 저장되고 /p/<uuid> 주소를 쓴다.
-- 인자가 늘었으므로 옛 3-인자 함수가 남지 않게 먼저 지운다 (오버로드 모호성 방지).
drop function if exists public.create_project(text, text, jsonb);
create or replace function public.create_project(p_name text, p_pw text, p_data jsonb, p_slug text default null)
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

-- ── RPC: 비번 변경/해제 (owner 만, 서버에서 해시) ────────────
create or replace function public.set_project_password(p_id uuid, p_pw text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.projects
     set password_hash = case when p_pw is null or p_pw = '' then null else crypt(p_pw, gen_salt('bf')) end,
         updated_at    = now()
   where id = p_id and owner_id = auth.uid();
  if not found then
    raise exception 'project not found or not owner';
  end if;
end;
$$;

revoke all on function public.set_project_password(uuid, text) from public;
grant execute on function public.set_project_password(uuid, text) to authenticated;

-- 저장(data 갱신)·이름변경은 owner·슈퍼관리자, 삭제는 owner 만.
-- 클라이언트에서 테이블을 직접 갱신하며 RLS 정책이 이를 보장한다.
-- (projects_owner_all + projects_super_admin_update)
