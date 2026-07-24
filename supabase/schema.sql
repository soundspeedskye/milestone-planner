-- ─────────────────────────────────────────────────────────────
-- 마일스톤 플래너 · Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 실행하세요.
-- (여러 번 실행해도 안전하도록 대부분 idempotent 하게 작성)
--
-- 접근 모델
--   · 앱 진입      : @safience.com 로그인 필수
--   · 목록 조회    : 로그인 회원이면 모든 프로젝트 메타(내용 제외)가 보임
--   · 내용 열람    : owner 는 바로, 그 외에는 프로젝트 비번 일치 시
--   · 편집/삭제    : owner 만
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
  data          jsonb not null default '{}'::jsonb,
  password_hash text,                       -- null 이면 owner 외엔 못 엶
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects(owner_id);

alter table public.projects enable row level security;

-- 테이블 직접 접근은 owner 본인 행만 (select/insert/update/delete 전부).
-- 남의 프로젝트 목록·열람은 아래 SECURITY DEFINER 함수로만 나간다.
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── RPC: 모든 프로젝트 메타 목록 (내용 data 는 제외) ──────────
create or replace function public.list_projects()
returns table (
  id           uuid,
  name         text,
  owner_name   text,
  is_mine      boolean,
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
         coalesce(pr.display_name, pr.email, '알 수 없음') as owner_name,
         p.owner_id = auth.uid()             as is_mine,
         p.password_hash is not null         as has_password,
         p.updated_at
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  order by p.updated_at desc;
$$;

revoke all on function public.list_projects() from public;
grant execute on function public.list_projects() to authenticated;

-- ── RPC: 프로젝트 열람 (owner 는 비번 무시, 그 외는 비번 대조) ─
create or replace function public.open_project(p_id uuid, p_pw text default null)
returns table (
  id         uuid,
  name       text,
  data       jsonb,
  is_mine    boolean,
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
         p.owner_id = auth.uid() as is_mine,
         p.updated_at
  from public.projects p
  where p.id = p_id
    and (
      p.owner_id = auth.uid()
      or (p.password_hash is not null and p.password_hash = crypt(p_pw, p.password_hash))
    );
$$;

revoke all on function public.open_project(uuid, text) from public;
grant execute on function public.open_project(uuid, text) to authenticated;

-- ── RPC: 프로젝트 생성 (비번은 서버에서 해시) ────────────────
create or replace function public.create_project(p_name text, p_pw text, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.projects (owner_id, name, data, password_hash)
  values (
    auth.uid(),
    p_name,
    coalesce(p_data, '{}'::jsonb),
    case when p_pw is null or p_pw = '' then null else crypt(p_pw, gen_salt('bf')) end
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.create_project(text, text, jsonb) from public;
grant execute on function public.create_project(text, text, jsonb) to authenticated;

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

-- 저장(data 갱신)·이름변경·삭제는 owner RLS 로 클라이언트에서 직접 처리한다.
-- (projects_owner_all 정책이 보장)
