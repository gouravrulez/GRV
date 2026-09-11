-- Run once in the KAOMA Supabase SQL Editor before enabling Razorpay checkout.
alter table public.orders add column if not exists razorpay_order_id text unique;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists razorpay_signature text;
alter table public.orders add column if not exists paid_at timestamptz;
create index if not exists idx_orders_razorpay_order_id on public.orders(razorpay_order_id);

create or replace function public.finalize_razorpay_order(
  p_order_id uuid, p_payment_id text, p_signature text, p_payment_status text
) returns void
language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
  if p_payment_status not in ('captured','authorized') then raise exception 'Invalid payment status'; end if;
  update public.orders set
    razorpay_payment_id=p_payment_id,
    razorpay_signature=p_signature,
    payment_status=p_payment_status,
    status=case when p_payment_status='captured' then 'confirmed' else status end,
    paid_at=case when p_payment_status='captured' then now() else paid_at end
  where id=p_order_id and payment_status not in ('captured','paid')
  returning true into changed;
  if coalesce(changed,false) and p_payment_status='captured' then
    update public.products p set stock_quantity=greatest(0,p.stock_quantity-lines.quantity)
    from (select product_id,sum(quantity)::integer quantity from public.order_items where order_id=p_order_id group by product_id) lines
    where p.id=lines.product_id;
  end if;
end; $$;

revoke all on function public.finalize_razorpay_order(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.finalize_razorpay_order(uuid,text,text,text) to service_role;
