-- KAOMA growth suite: run once in Supabase SQL Editor
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists google_product_category text;
alter table public.products add column if not exists brand text default 'KAOMA';

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric not null check (discount_value > 0),
  minimum_order numeric not null default 0,
  maximum_discount numeric,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  country text not null,
  address_line1 text not null,
  city text not null,
  region text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, order_id)
);
create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  items jsonb not null default '[]'::jsonb,
  cart_total numeric not null default 0,
  currency text not null default 'INR',
  recovered boolean not null default false,
  reminder_sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(email)
);

alter table public.coupons enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.return_requests enable row level security;
alter table public.abandoned_carts enable row level security;

drop policy if exists "customers manage own addresses" on public.customer_addresses;
create policy "customers manage own addresses" on public.customer_addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "customers create own returns" on public.return_requests;
create policy "customers create own returns" on public.return_requests for insert with check (auth.uid() = user_id);
drop policy if exists "customers view own returns" on public.return_requests;
create policy "customers view own returns" on public.return_requests for select using (auth.uid() = user_id);
drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons for all using (exists(select 1 from public.admins where user_id=auth.uid())) with check (exists(select 1 from public.admins where user_id=auth.uid()));
drop policy if exists "admins manage returns" on public.return_requests;
create policy "admins manage returns" on public.return_requests for all using (exists(select 1 from public.admins where user_id=auth.uid())) with check (exists(select 1 from public.admins where user_id=auth.uid()));
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id);
create index if not exists return_requests_order_idx on public.return_requests(order_id);
create index if not exists abandoned_carts_due_idx on public.abandoned_carts(updated_at, reminder_sent_at);
