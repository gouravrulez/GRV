-- KAOMA product experience upgrade
alter table public.products add column if not exists size_guide text;
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id,email)
);
alter table public.stock_notifications enable row level security;
grant all privileges on table public.stock_notifications to service_role;
create index if not exists stock_notifications_product_idx on public.stock_notifications(product_id,notified_at);
notify pgrst, 'reload schema';
