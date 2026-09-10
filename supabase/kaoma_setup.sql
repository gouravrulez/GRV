create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id) on delete cascade,
  name text not null, slug text not null, icon_url text, sort_order integer not null default 0, active boolean not null default true,
  unique(category_id,slug)
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  price numeric(12,2),
  compare_at_price numeric(12,2),
  sku text unique,
  stock_quantity integer not null default 0,
  sizes text[] not null default '{}',
  colours text[] not null default '{}',
  featured boolean not null default false,
  best_seller boolean not null default false,
  new_arrival boolean not null default false,
  currency text not null default 'INR',
  image_urls text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','sold_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.profiles (user_id uuid primary key references auth.users(id) on delete cascade, full_name text, email text, phone text, country text, address_line1 text, city text, region text, postal_code text, created_at timestamptz not null default now());
create table if not exists public.orders (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, order_number text not null unique, customer_email text not null, currency text not null, subtotal numeric(12,2) not null default 0, shipping numeric(12,2) not null default 0, tax numeric(12,2) not null default 0, total numeric(12,2) not null default 0, status text not null default 'pending', payment_status text not null default 'pending', shipping_address jsonb not null default '{}', tracking_number text, created_at timestamptz not null default now());
create table if not exists public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, product_name text not null, quantity integer not null check(quantity>0), unit_price numeric(12,2) not null, selected_size text, selected_colour text);
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, reviewer_name text not null default 'Verified customer',
  rating integer not null check (rating between 1 and 5), title text, body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_subcategory_id on public.products(subcategory_id);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_reviews_status_created on public.reviews(status,created_at desc);

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

create policy "admin can see own role" on public.admins for select to authenticated using ((select auth.uid()) = user_id);
create policy "public can view active categories" on public.categories for select to anon, authenticated using (active = true or exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "admins manage categories" on public.categories for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "public can view active subcategories" on public.subcategories for select to anon, authenticated using (active = true or exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "admins manage subcategories" on public.subcategories for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "public can view active products" on public.products for select to anon, authenticated using (status = 'active' or exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "admins manage products" on public.products for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "public can view settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins manage settings" on public.site_settings for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "customers manage own profile" on public.profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "admins view profiles" on public.profiles for select to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "customers view own orders" on public.orders for select to authenticated using ((select auth.uid())=user_id or exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "customers create own orders" on public.orders for insert to authenticated with check ((select auth.uid())=user_id);
create policy "admins manage orders" on public.orders for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "customers view own order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or exists(select 1 from public.admins where user_id=(select auth.uid())))));
create policy "customers create own order items" on public.order_items for insert to authenticated with check (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "admins manage order items" on public.order_items for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "public view approved reviews" on public.reviews for select to anon, authenticated using (status='approved' or exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "customers create own reviews" on public.reviews for insert to authenticated with check ((select auth.uid())=user_id);
create policy "admins manage reviews" on public.reviews for all to authenticated using (exists(select 1 from public.admins where user_id=(select auth.uid()))) with check (exists(select 1 from public.admins where user_id=(select auth.uid())));

grant select on public.categories, public.subcategories, public.products, public.site_settings to anon;
grant select, insert, update, delete on public.categories, public.subcategories, public.products, public.site_settings, public.profiles, public.orders, public.order_items to authenticated;
grant select on public.admins to authenticated;
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;

create or replace function public.handle_new_profile()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.profiles(user_id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email) on conflict(user_id) do update set email=excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.handle_new_profile();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "public product images" on storage.objects for select to anon,authenticated using(bucket_id='product-images');
create policy "admins upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "admins update product images" on storage.objects for update to authenticated using(bucket_id='product-images' and exists(select 1 from public.admins where user_id=(select auth.uid()))) with check(bucket_id='product-images' and exists(select 1 from public.admins where user_id=(select auth.uid())));
create policy "admins delete product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and exists(select 1 from public.admins where user_id=(select auth.uid())));

-- After creating the administrator in Supabase Authentication, run once:
-- insert into public.admins(user_id) select id from auth.users where email='YOUR_ADMIN_EMAIL';
