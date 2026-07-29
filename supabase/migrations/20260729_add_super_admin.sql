-- 슈퍼관리자 읽기 전용 열람 권한 추가
-- 대상: 기존 운영 Supabase 프로젝트
-- 영향: projects의 기존 데이터·owner_id·password_hash는 변경하지 않는다.

create table if not exists public.super_admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;
revoke all on table public.super_admins from anon, authenticated;

-- 가입된 계정의 auth.users UUID에만 권한을 연결한다.
insert into public.super_admins (user_id)
select id
from auth.users
where lower(email) = 'super-tester@safience.com'
on conflict (user_id) do nothing;

-- 반환 형식에 can_bypass_password 열을 추가하므로 재생성한다.
drop function if exists public.list_projects();
create function public.list_projects()
returns table (
  id                  uuid,
  name                text,
  owner_name          text,
  is_mine             boolean,
  can_bypass_password boolean,
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
         p.owner_id = auth.uid() as is_mine,
         (
           p.owner_id = auth.uid()
           or exists (
             select 1
             from public.super_admins sa
             where sa.user_id = auth.uid()
           )
         ) as can_bypass_password,
         p.password_hash is not null as has_password,
         p.updated_at
  from public.projects p
  left join public.profiles pr on pr.id = p.owner_id
  order by p.created_at desc;
$$;

revoke all on function public.list_projects() from public;
grant execute on function public.list_projects() to authenticated;

-- 반환 형식은 그대로라 기존 함수를 안전하게 교체한다.
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
      or exists (
        select 1
        from public.super_admins sa
        where sa.user_id = auth.uid()
      )
      or (p.password_hash is not null and p.password_hash = crypt(p_pw, p.password_hash))
    );
$$;

revoke all on function public.open_project(uuid, text) from public;
grant execute on function public.open_project(uuid, text) to authenticated;
