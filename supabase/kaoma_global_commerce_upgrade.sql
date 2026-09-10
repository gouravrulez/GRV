-- KAOMA global commerce upgrade — safe to run once in Supabase SQL Editor.
alter table public.products add column if not exists category_ids uuid[] not null default '{}';
alter table public.products add column if not exists short_description text;
alter table public.products add column if not exists material text;
alter table public.products add column if not exists care_instructions text;
alter table public.products add column if not exists colour_image_map jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists related_product_ids uuid[] not null default '{}';
alter table public.products add column if not exists enable_add_to_cart boolean not null default true;
alter table public.products add column if not exists enable_buy_now boolean not null default true;
alter table public.products add column if not exists enable_wishlist boolean not null default true;
create index if not exists idx_products_category_ids on public.products using gin(category_ids);

update public.products set category_ids=array[category_id] where category_id is not null and cardinality(category_ids)=0;

insert into public.categories(name,slug,sort_order,active) values
 ('For Women','for-women',10,true),('For Men','for-men',20,true),('Golden Night','golden-night',30,true),
 ('Foreplay','foreplay',40,true),('Unique Gifts','unique-gifts',50,true)
on conflict(slug) do update set name=excluded.name,active=true,sort_order=excluded.sort_order;

insert into public.site_settings(key,value) values ('commerce','{"base_currency":"INR","rates":{"INR":1,"USD":0.012,"GBP":0.0094,"EUR":0.011,"AED":0.044,"AUD":0.018,"CAD":0.016,"SGD":0.016},"shipping":{"India":99,"International":1499,"free_above":5000},"payments":{"provider":"manual","enabled":false}}'::jsonb)
on conflict(key) do nothing;

grant select on public.categories, public.products, public.site_settings to anon;
grant select,insert,update,delete on public.categories,public.products,public.site_settings to authenticated;
