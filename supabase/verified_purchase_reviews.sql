drop policy if exists "customers create own reviews" on public.reviews;
create policy "verified customers create own reviews"
on public.reviews for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
  and exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = reviews.product_id
      and o.user_id = (select auth.uid())
      and o.payment_status = 'paid'
  )
);
create unique index if not exists reviews_one_per_customer_product
on public.reviews(user_id, product_id) where user_id is not null;
