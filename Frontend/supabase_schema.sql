-- ==========================================================
-- Guardián de Gastos — Esquema PostgreSQL para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ==========================================================

-- 1) Tabla de familias (1:1 con auth.users)
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  family_name text not null,
  created_at timestamptz not null default now()
);

-- 2) Miembros de la familia
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  monthly_income numeric(12,2) not null default 0 check (monthly_income >= 0),
  color text not null default 'hsl(270 85% 60%)',
  created_at timestamptz not null default now()
);
create index if not exists idx_members_family on public.members(family_id);

-- 3) Categorías permitidas
do $$ begin
  create type public.expense_category as enum
    ('Alimentación','Transporte','Entretenimiento','Salud','Vivienda','Otros');
exception when duplicate_object then null; end $$;

-- 4) Gastos
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  category public.expense_category not null default 'Otros',
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_family on public.expenses(family_id);
create index if not exists idx_expenses_member on public.expenses(member_id);
create index if not exists idx_expenses_date on public.expenses(date desc);

-- 5) Trigger: al crear un usuario en auth.users, crea su family
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.families (user_id, family_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'family_name', 'Mi Familia'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Helper: family_id del usuario actual (security definer evita recursión RLS)
create or replace function public.current_family_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.families where user_id = auth.uid() limit 1;
$$;

-- 7) Habilitar Row Level Security
alter table public.families enable row level security;
alter table public.members  enable row level security;
alter table public.expenses enable row level security;

-- 8) Políticas RLS — cada familia solo ve / modifica sus datos

-- families
drop policy if exists "families self read"   on public.families;
drop policy if exists "families self update" on public.families;
create policy "families self read"   on public.families for select using (user_id = auth.uid());
create policy "families self update" on public.families for update using (user_id = auth.uid());

-- members
drop policy if exists "members read"   on public.members;
drop policy if exists "members insert" on public.members;
drop policy if exists "members update" on public.members;
drop policy if exists "members delete" on public.members;
create policy "members read"   on public.members for select using (family_id = public.current_family_id());
create policy "members insert" on public.members for insert with check (family_id = public.current_family_id());
create policy "members update" on public.members for update using (family_id = public.current_family_id());
create policy "members delete" on public.members for delete using (family_id = public.current_family_id());

-- expenses
drop policy if exists "expenses read"   on public.expenses;
drop policy if exists "expenses insert" on public.expenses;
drop policy if exists "expenses update" on public.expenses;
drop policy if exists "expenses delete" on public.expenses;
create policy "expenses read"   on public.expenses for select using (family_id = public.current_family_id());
create policy "expenses insert" on public.expenses for insert with check (family_id = public.current_family_id());
create policy "expenses update" on public.expenses for update using (family_id = public.current_family_id());
create policy "expenses delete" on public.expenses for delete using (family_id = public.current_family_id());

-- ==========================================================
-- Listo. Ahora desde el cliente (Supabase JS):
--   supabase.auth.signUp({ email, password,
--      options: { data: { family_name: 'Pérez García' } } });
-- y consulta normalmente public.members / public.expenses.
-- ==========================================================
