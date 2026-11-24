-- Northline player profile, saves, and the cash ledger.
-- Display names may be seeded from auth metadata; authorization uses auth.uid() only.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  callsign text not null check (char_length(callsign) between 2 and 24),
  created_at timestamptz not null default now()
);

create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot integer not null default 0 check (slot >= 0 and slot < 8),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

create table public.economy_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  amount integer not null check (amount <> 0 and amount between -100000 and 100000),
  reason text not null check (reason in ('mission', 'property')),
  balance_after integer not null check (balance_after >= 0 and balance_after <= 10000000),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index economy_ledger_user_created_idx
  on public.economy_ledger (user_id, created_at desc);

create table public.owned_properties (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id text not null check (char_length(property_id) between 1 and 64),
  purchased_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 64),
  quantity integer not null default 1 check (quantity > 0 and quantity < 100),
  unique (user_id, item_id)
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.economy_ledger enable row level security;
alter table public.owned_properties enable row level security;
alter table public.inventory_items enable row level security;

revoke all on table public.profiles from anon, public;
revoke all on table public.saves from anon, public;
revoke all on table public.economy_ledger from anon, public;
revoke all on table public.owned_properties from anon, public;
revoke all on table public.inventory_items from anon, public;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.saves to authenticated;
grant select, insert on table public.economy_ledger to authenticated;
grant select, insert, delete on table public.owned_properties to authenticated;
grant select, insert, update, delete on table public.inventory_items to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy saves_select_own on public.saves
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy saves_insert_own on public.saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy saves_update_own on public.saves
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy saves_delete_own on public.saves
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy ledger_select_own on public.economy_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ledger_insert_own on public.economy_ledger
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy properties_select_own on public.owned_properties
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy properties_insert_own on public.owned_properties
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy properties_delete_own on public.owned_properties
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy inventory_select_own on public.inventory_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy inventory_insert_own on public.inventory_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy inventory_update_own on public.inventory_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy inventory_delete_own on public.inventory_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, callsign)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'callsign', 24), ''), 'Runner')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
