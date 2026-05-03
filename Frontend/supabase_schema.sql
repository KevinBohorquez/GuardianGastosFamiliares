-- ==========================================================
-- Guardián de Gastos — Esquema PostgreSQL para Supabase (Cuentas Individuales)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ==========================================================

-- Limpieza de esquema anterior (opcional si es entorno de desarrollo limpio)
drop table if exists public.notifications cascade;
drop table if exists public.expenses cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;
drop table if exists public.profiles cascade;
drop type if exists public.expense_category cascade;
drop type if exists public.family_member_status cascade;
drop type if exists public.notification_type cascade;

-- 1) Tipos
do $$ begin
  create type public.expense_category as enum ('Alimentación','Transporte','Entretenimiento','Salud','Vivienda','Otros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.family_member_status as enum ('pending', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('expense_alert', 'family_invite');
exception when duplicate_object then null; end $$;

-- 2) Perfiles Individuales (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  monthly_income numeric(12,2) not null default 0 check (monthly_income >= 0),
  expense_ratio_threshold numeric(5,2) not null default 0.8, -- 80% del ingreso mensual
  color text not null default 'hsl(270 85% 60%)',
  created_at timestamptz not null default now()
);

-- 3) Familias (Grupos)
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null unique references auth.users(id) on delete cascade,
  family_name text not null,
  created_at timestamptz not null default now()
);

-- 4) Miembros de Familias (Relación y estado de invitaciones)
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade, -- un usuario solo puede pertenecer a una familia (RNF-06)
  status public.family_member_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- 5) Gastos Individuales
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  category public.expense_category not null default 'Otros',
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date desc);

-- 6) Notificaciones
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  related_entity_id uuid, -- ID de familia para invitaciones, o de gasto
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- ==========================================================
-- Triggers
-- ==========================================================

-- Trigger: al crear un usuario en auth.users, crea su profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Usuario Nuevo'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: Alerta de presupuesto (RF-02, RNF-05)
create or replace function public.check_budget_alert()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  total_spent numeric;
  user_income numeric;
  user_threshold numeric;
begin
  -- Obtener información del perfil
  select monthly_income, expense_ratio_threshold into user_income, user_threshold
  from public.profiles where id = new.user_id;

  if user_income > 0 then
    -- Calcular el gasto total del mes actual incluyendo el nuevo gasto
    select coalesce(sum(amount), 0) into total_spent
    from public.expenses
    where user_id = new.user_id
      and date_trunc('month', date) = date_trunc('month', new.date);

    if (total_spent / user_income) >= user_threshold then
      -- Generar notificación si no hay una reciente (opcional, aquí generamos siempre)
      insert into public.notifications (user_id, type, message, related_entity_id)
      values (
        new.user_id,
        'expense_alert',
        'Has excedido el ' || (user_threshold * 100)::int || '% de tu presupuesto mensual.',
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_expense_created on public.expenses;
create trigger on_expense_created
  after insert on public.expenses
  for each row execute function public.check_budget_alert();


-- ==========================================================
-- RLS (Row Level Security)
-- ==========================================================
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;

-- Función helper para verificar si es lider
create or replace function public.is_leader_of_family(check_family_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.families where id = check_family_id and leader_id = auth.uid()
  );
$$;

-- Función helper para obtener los IDs de usuarios que están en la familia del líder
create or replace function public.get_my_family_members()
returns setof uuid language sql stable security definer as $$
  select user_id from public.family_members
  where status = 'accepted'
    and family_id in (select id from public.families where leader_id = auth.uid());
$$;

-- PROFILES
-- Leo mi perfil, y también puedo leer los perfiles de los miembros aceptados de mi familia
create policy "profiles_read" on public.profiles for select using (
  id = auth.uid() or id in (select public.get_my_family_members())
);
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- FAMILIES
create policy "families_read" on public.families for select using (
  leader_id = auth.uid() or id in (select family_id from public.family_members where user_id = auth.uid())
);
create policy "families_insert" on public.families for insert with check (leader_id = auth.uid());
create policy "families_delete" on public.families for delete using (leader_id = auth.uid());

-- FAMILY MEMBERS (Invitaciones)
-- Puedo ver las invitaciones si soy el líder que invitó o si soy el usuario invitado
create policy "family_members_read" on public.family_members for select using (
  user_id = auth.uid() or public.is_leader_of_family(family_id)
);
-- Solo el líder puede invitar
create policy "family_members_insert" on public.family_members for insert with check (
  public.is_leader_of_family(family_id)
);
-- El usuario invitado puede actualizar para aceptar/rechazar
create policy "family_members_update" on public.family_members for update using (
  user_id = auth.uid()
);
-- El líder o el propio usuario pueden eliminar (salir de la familia)
create policy "family_members_delete" on public.family_members for delete using (
  user_id = auth.uid() or public.is_leader_of_family(family_id)
);

-- EXPENSES
-- Leo mis gastos, o si soy líder, leo los de los miembros de mi familia
create policy "expenses_read" on public.expenses for select using (
  user_id = auth.uid() or user_id in (select public.get_my_family_members())
);
create policy "expenses_insert" on public.expenses for insert with check (user_id = auth.uid());
create policy "expenses_update" on public.expenses for update using (user_id = auth.uid());
create policy "expenses_delete" on public.expenses for delete using (user_id = auth.uid());

-- NOTIFICATIONS
create policy "notifications_read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_delete" on public.notifications for delete using (user_id = auth.uid());
